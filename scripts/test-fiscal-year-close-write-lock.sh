#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
migration="supabase/migrations/20261124240500_serialize_fiscal_year_close_writes.sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.condominium_fiscal_years (
  id uuid PRIMARY KEY,
  status text NOT NULL
);

CREATE TABLE public.condominium_ledger_entries (
  id uuid PRIMARY KEY,
  fiscal_year_id uuid
);

CREATE TABLE public.condominium_budgets (
  fiscal_year_id uuid
);

CREATE TABLE public.condominium_installments (
  id uuid,
  fiscal_year_id uuid
);

CREATE TABLE public.condominium_expense_allocations (
  ledger_entry_id uuid
);

CREATE TABLE public.condominium_payment_movements (
  installment_id uuid
);
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TRIGGER trg_block_closed_ledger
BEFORE INSERT OR UPDATE OR DELETE ON public.condominium_ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_condominium_accounting();

INSERT INTO public.condominium_fiscal_years(id,status)
VALUES
 ('10000000-0000-0000-0000-000000000001','Aperto'),
 ('10000000-0000-0000-0000-000000000002','Aperto');

-- Normal writes in open exercises remain allowed.
INSERT INTO public.condominium_ledger_entries(id,fiscal_year_id)
VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');

UPDATE public.condominium_ledger_entries
SET fiscal_year_id='10000000-0000-0000-0000-000000000002'
WHERE id='20000000-0000-0000-0000-000000000001';

DELETE FROM public.condominium_ledger_entries
WHERE id='20000000-0000-0000-0000-000000000001';

-- A write that starts after closure must be rejected.
UPDATE public.condominium_fiscal_years
SET status='Chiuso'
WHERE id='10000000-0000-0000-0000-000000000001';

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.condominium_ledger_entries(id,fiscal_year_id)
    VALUES ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST_EXPECTED_CLOSED_YEAR_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_CLOSED_YEAR_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.' THEN RAISE; END IF;
  END;
END
$test$;
SQL

# A concurrent write must wait for the closing transaction, then observe Chiuso.
first_log="$(mktemp)"
second_log="$(mktemp)"
trap 'rm -f "$first_log" "$second_log"' EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<'SQL' &
BEGIN;
SELECT id FROM public.condominium_fiscal_years
WHERE id='10000000-0000-0000-0000-000000000002'
FOR UPDATE;
UPDATE public.condominium_fiscal_years
SET status='Chiuso'
WHERE id='10000000-0000-0000-0000-000000000002';
\echo FISCAL_YEAR_CLOSE_LOCK_HELD
SELECT pg_sleep(2);
COMMIT;
SQL
first_pid=$!

for attempt in {1..50}; do
  if grep -q "FISCAL_YEAR_CLOSE_LOCK_HELD" "$first_log"; then
    break
  fi
  sleep 0.1
done
if ! grep -q "FISCAL_YEAR_CLOSE_LOCK_HELD" "$first_log"; then
  wait "$first_pid"
  echo "Closing transaction did not acquire the fiscal-year lock"
  exit 1
fi

if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<'SQL'; then
INSERT INTO public.condominium_ledger_entries(id,fiscal_year_id)
VALUES ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002');
SQL
  echo "Concurrent write unexpectedly entered a closing fiscal year"
  wait "$first_pid"
  exit 1
fi

wait "$first_pid"
grep -F "L'esercizio contabile di destinazione è chiuso: modifica non consentita." "$second_log"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.condominium_ledger_entries
    WHERE id='20000000-0000-0000-0000-000000000003'
  ) THEN
    RAISE EXCEPTION 'Concurrent write into closed fiscal year was persisted';
  END IF;
END
$test$;
SQL
