#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
migration="supabase/rebuild/candidates/accounting-point1-20261124/20261124240400_harden_work_progress_payment_allocation.sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$roles$;

CREATE TABLE public.condominium_works (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  supplier_id uuid
);

CREATE TABLE public.condominium_ledger_entries (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  direction text NOT NULL,
  supplier_id uuid,
  amount numeric NOT NULL,
  fiscal_year_id uuid,
  document_id uuid
);

CREATE TABLE public.condominium_expense_allocations (
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  ledger_entry_id uuid NOT NULL
);

CREATE TABLE public.condominium_installments (
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  ledger_entry_id uuid NOT NULL
);

CREATE TABLE public.condominium_work_progress (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL DEFAULT '10000000-0000-0000-0000-000000000001',
  condominium_id uuid NOT NULL DEFAULT '20000000-0000-0000-0000-000000000001',
  work_id uuid NOT NULL,
  ledger_entry_id uuid,
  payment_entry_id uuid,
  paid_amount numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.condominium_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominium_work_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_entries_authenticated_all
  ON public.condominium_ledger_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY work_progress_authenticated_hidden
  ON public.condominium_work_progress
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
GRANT SELECT, UPDATE, DELETE ON public.condominium_ledger_entries TO authenticated;
GRANT SELECT ON public.condominium_work_progress TO authenticated;
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "supabase/rebuild/candidates/accounting-point1-20261124/20261124240200_guard_ledger_entries_linked_to_work_progress.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TRIGGER validate_condominium_work_progress_accounting_links
BEFORE INSERT OR UPDATE ON public.condominium_work_progress
FOR EACH ROW
EXECUTE FUNCTION public.validate_condominium_work_progress_accounting_links();

CREATE TRIGGER trg_guard_ledger_entry_integrity
BEFORE DELETE OR UPDATE ON public.condominium_ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.guard_ledger_entry_integrity();

INSERT INTO public.condominium_works(id,workspace_id,condominium_id)
VALUES
 ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');

INSERT INTO public.condominium_ledger_entries(id,workspace_id,condominium_id,direction,amount)
VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Uscita',100),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Uscita',100),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Uscita',50),
 ('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Uscita',100);

-- An unrelated ledger entry remains editable.
UPDATE public.condominium_ledger_entries
SET amount=55
WHERE id='30000000-0000-0000-0000-000000000003';

-- Exact payment coverage split across two SALs must remain valid.
INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
VALUES
 ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',60),
 ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',40);

INSERT INTO public.condominium_work_progress(id,work_id,ledger_entry_id,paid_amount)
VALUES
 ('40000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',0);

-- Updating a row must exclude its previous value, not double-count it.
UPDATE public.condominium_work_progress
SET paid_amount=40
WHERE id='40000000-0000-0000-0000-000000000002';

DO $test$
BEGIN
  BEGIN
    UPDATE public.condominium_work_progress
    SET paid_amount=40.01
    WHERE id='40000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'TEST_EXPECTED_UPDATE_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_UPDATE_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La somma dei SAL collegati supera l''importo del movimento di pagamento' THEN RAISE; END IF;
  END;
END
$test$;

-- A payment cannot be reused across different works beyond its total amount.
INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
VALUES
 ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',70);

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
    VALUES ('40000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002',40);
    RAISE EXCEPTION 'TEST_EXPECTED_INSERT_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_INSERT_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La somma dei SAL collegati supera l''importo del movimento di pagamento' THEN RAISE; END IF;
  END;
END
$test$;

-- Accounting users cannot see activity-module rows under RLS, but the
-- integrity trigger must still enforce the rule as its SECURITY DEFINER owner.
SET ROLE authenticated;
DO $test$
BEGIN
  IF (SELECT count(*) FROM public.condominium_work_progress
      WHERE payment_entry_id='30000000-0000-0000-0000-000000000001') <> 0 THEN
    RAISE EXCEPTION 'RLS fixture should hide work progress from authenticated';
  END IF;
END
$test$;

-- Linked payment movements cannot be edited or deleted after assignment.
DO $test$
BEGIN
  BEGIN
    UPDATE public.condominium_ledger_entries
    SET amount=90
    WHERE id='30000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'TEST_EXPECTED_LEDGER_UPDATE_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_LEDGER_UPDATE_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La voce contabile è collegata a ripartizioni, rate o SAL: importo, direzione, esercizio, fornitore, documento e appartenenza non possono essere modificati' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM public.condominium_ledger_entries
    WHERE id='30000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'TEST_EXPECTED_LEDGER_DELETE_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_LEDGER_DELETE_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La voce contabile è collegata a uno o più SAL e non può essere cancellata' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.condominium_ledger_entries
    SET amount=90
    WHERE id='30000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'TEST_EXPECTED_EXPENSE_LEDGER_UPDATE_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_EXPENSE_LEDGER_UPDATE_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La voce contabile è collegata a ripartizioni, rate o SAL: importo, direzione, esercizio, fornitore, documento e appartenenza non possono essere modificati' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM public.condominium_ledger_entries
    WHERE id='30000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'TEST_EXPECTED_EXPENSE_LEDGER_DELETE_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_EXPENSE_LEDGER_DELETE_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'La voce contabile è collegata a uno o più SAL e non può essere cancellata' THEN RAISE; END IF;
  END;
END
$test$;
RESET ROLE;

DO $test$
BEGIN
  IF (SELECT round(sum(paid_amount),2)
      FROM public.condominium_work_progress
      WHERE payment_entry_id='30000000-0000-0000-0000-000000000001') <> 100 THEN
    RAISE EXCEPTION 'Unexpected cumulative amount for accepted payment split';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE id='40000000-0000-0000-0000-000000000004'
  ) THEN
    RAISE EXCEPTION 'Rejected over-allocation was persisted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_ledger_entries
    WHERE id='30000000-0000-0000-0000-000000000001' AND amount=100
  ) THEN
    RAISE EXCEPTION 'Linked payment entry was modified or deleted';
  END IF;
END
$test$;
SQL

# Two concurrent sessions must serialize on the same ledger payment row.
first_log="$(mktemp)"
second_log="$(mktemp)"
trap 'rm -f "$first_log" "$second_log"' EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<'SQL' &
BEGIN;
INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
VALUES ('40000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000004',
        '30000000-0000-0000-0000-000000000004',60);
\echo PAYMENT_LOCK_HELD
SELECT pg_sleep(2);
COMMIT;
SQL
first_pid=$!

for attempt in {1..50}; do
  if grep -q "PAYMENT_LOCK_HELD" "$first_log"; then
    break
  fi
  sleep 0.1
done
if ! grep -q "PAYMENT_LOCK_HELD" "$first_log"; then
  wait "$first_pid"
  echo "First transaction did not acquire the payment lock"
  exit 1
fi

if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<'SQL'; then
BEGIN;
INSERT INTO public.condominium_work_progress(id,work_id,payment_entry_id,paid_amount)
VALUES ('40000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000005',
        '30000000-0000-0000-0000-000000000004',60);
COMMIT;
SQL
  echo "Concurrent over-allocation unexpectedly succeeded"
  wait "$first_pid"
  exit 1
fi

wait "$first_pid"
grep -F "La somma dei SAL collegati supera l'importo del movimento di pagamento" "$second_log"
