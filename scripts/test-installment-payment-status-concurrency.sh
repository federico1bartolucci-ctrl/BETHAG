#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

legacy_migration="supabase/rebuild/candidates/accounting-point1-20261124/20261124170000_reconcile_ledger_status_on_installment_move.sql"
fixed_migration="supabase/rebuild/candidates/accounting-point1-20261124/20261124233600_serialize_installment_payment_status_recalculation.sql"
tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.condominium_ledger_entries (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  fiscal_year_id uuid,
  direction text NOT NULL,
  amount numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'Registrato',
  due_date date
);
ALTER TABLE public.condominium_ledger_entries
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Registrato';

CREATE TABLE IF NOT EXISTS public.condominium_installments (
  id uuid PRIMARY KEY,
  ledger_entry_id uuid,
  amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL
);
ALTER TABLE public.condominium_installments
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS condominium_id uuid,
  ADD COLUMN IF NOT EXISTS fiscal_year_id uuid,
  ADD COLUMN IF NOT EXISTS unit_id uuid,
  ADD COLUMN IF NOT EXISTS member_id uuid;

CREATE TABLE IF NOT EXISTS public.condominium_fiscal_years (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'Aperto'
);
INSERT INTO public.condominium_fiscal_years
  (id, workspace_id, condominium_id, start_date, end_date, status)
VALUES
  ('00000000-0000-0000-0000-000000000081',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   current_date - 365, current_date + 365, 'Aperto')
ON CONFLICT (id) DO UPDATE
SET workspace_id=EXCLUDED.workspace_id,
    condominium_id=EXCLUDED.condominium_id,
    start_date=EXCLUDED.start_date,
    end_date=EXCLUDED.end_date,
    status='Aperto';
SQL

# Reinstall the previous implementation to prove the race before applying
# the correction. This is an isolated PostgreSQL 17 regression database.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$legacy_migration"

wait_for_marker() {
  local log_file="$1"
  local marker="$2"
  local pid="$3"
  for attempt in {1..200}; do
    if grep -q "$marker" "$log_file"; then return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      cat "$log_file"
      echo "Process exited before marker: $marker"
      return 1
    fi
    sleep 0.05
  done
  cat "$log_file"
  echo "Timed out waiting for marker: $marker"
  return 1
}

wait_for_lock_waiter() {
  local app_name="$1"
  local log_file="$2"
  local pid="$3"
  for attempt in {1..200}; do
    local waiting
    waiting="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
      -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$app_name' AND wait_event_type='Lock'")"
    if [[ "$waiting" =~ ^[1-9][0-9]*$ ]]; then return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      cat "$log_file"
      echo "Process exited before entering the expected lock wait: $app_name"
      return 1
    fi
    sleep 0.05
  done
  cat "$log_file"
  echo "Timed out waiting for PostgreSQL lock wait: $app_name"
  return 1
}

run_payment_status_race() {
  local label="$1"
  local ledger_id="$2"
  local first_installment_id="$3"
  local second_installment_id="$4"
  local expected="$5"

  local first_app="${label}_first"
  local second_app="${label}_second"
  local first_log="$tmp_dir/$label-first.log"
  local second_log="$tmp_dir/$label-second.log"

  PGAPPNAME="$first_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<SQL &
BEGIN;
UPDATE public.condominium_installments
SET paid_amount=50
WHERE id='$first_installment_id';
\\echo FIRST_INSTALLMENT_UPDATED
SELECT pg_sleep(5);
COMMIT;
SQL
  local first_pid=$!
  wait_for_marker "$first_log" "FIRST_INSTALLMENT_UPDATED" "$first_pid"

  PGAPPNAME="$second_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<SQL &
BEGIN;
UPDATE public.condominium_installments
SET paid_amount=50
WHERE id='$second_installment_id';
COMMIT;
SQL
  local second_pid=$!
  wait_for_lock_waiter "$second_app" "$second_log" "$second_pid"

  wait "$first_pid"
  wait "$second_pid"

  local actual_status
  actual_status="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
    -c "SELECT payment_status FROM public.condominium_ledger_entries WHERE id='$ledger_id'")"
  local paid_total
  paid_total="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
    -c "SELECT coalesce(sum(paid_amount),0) FROM public.condominium_installments WHERE ledger_entry_id='$ledger_id'")"

  if [[ "$paid_total" != "100.00" && "$paid_total" != "100" ]]; then
    echo "Unexpected paid total for $label: $paid_total"
    return 1
  fi

  if [[ "$expected" == "legacy-stale" ]]; then
    if [[ "$actual_status" != "Parzialmente pagato" ]]; then
      echo "Legacy implementation did not reproduce stale aggregate: status=$actual_status paid=$paid_total"
      return 1
    fi
    echo "LEGACY DEFECT REPRODUCED: 100.00 paid but ledger status remained Parzialmente pagato ($label)"
    return 0
  fi

  if [[ "$actual_status" != "Pagato" ]]; then
    echo "Corrected implementation left stale payment status: status=$actual_status paid=$paid_total"
    return 1
  fi
  echo "PASS: concurrent installment updates serialize and ledger status is Pagato ($label)"
}

insert_fixture() {
  local ledger_id="$1"
  local first_installment_id="$2"
  local second_installment_id="$3"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.condominium_ledger_entries
  (id, workspace_id, condominium_id, fiscal_year_id, direction, amount, payment_status)
VALUES
  ('$ledger_id',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000081',
   'Uscita', 100.00, 'Registrato');

INSERT INTO public.condominium_installments
  (id, workspace_id, condominium_id, fiscal_year_id, ledger_entry_id, amount, paid_amount, due_date)
VALUES
  ('$first_installment_id',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000081',
   '$ledger_id', 50.00, 0.00, current_date + 30),
  ('$second_installment_id',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000081',
   '$ledger_id', 50.00, 0.00, current_date + 30);

DO \$verify\$
BEGIN
  IF (SELECT payment_status FROM public.condominium_ledger_entries WHERE id='$ledger_id') <> 'Da pagare' THEN
    RAISE EXCEPTION 'Fixture setup failed: expected initial Da pagare status';
  END IF;
END
\$verify\$;
SQL
}

insert_fixture   "90000000-0000-0000-0000-000000000010"   "90000000-0000-0000-0000-000000000110"   "90000000-0000-0000-0000-000000000111"

run_payment_status_race   "legacy_payment_status"   "90000000-0000-0000-0000-000000000010"   "90000000-0000-0000-0000-000000000110"   "90000000-0000-0000-0000-000000000111"   "legacy-stale"

# Apply the fix only after the previous implementation has reproduced the bug.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$fixed_migration"

insert_fixture   "90000000-0000-0000-0000-000000000020"   "90000000-0000-0000-0000-000000000120"   "90000000-0000-0000-0000-000000000121"

run_payment_status_race   "fixed_payment_status"   "90000000-0000-0000-0000-000000000020"   "90000000-0000-0000-0000-000000000120"   "90000000-0000-0000-0000-000000000121"   "fixed"


# Install the real fiscal-year guards on the isolated fixture tables. The
# supporting-regression database is intentionally minimal and does not load the
# complete baseline trigger inventory by itself.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "supabase/rebuild/candidates/accounting-point1-20261124/20261124233500_lock_fiscal_year_parent_rows.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP TRIGGER IF EXISTS trg_block_closed_installments ON public.condominium_installments;
CREATE TRIGGER trg_block_closed_installments
BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_installments
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();

DROP TRIGGER IF EXISTS trg_block_closed_ledger ON public.condominium_ledger_entries;
CREATE TRIGGER trg_block_closed_ledger
BEFORE INSERT OR DELETE OR UPDATE ON public.condominium_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();
SQL

# Install the production legacy validation trigger: it locks only NEW.ledger_entry_id
# before the AFTER status trigger, which is the other half of the lock-order cycle.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE OR REPLACE FUNCTION public.validate_condominium_installment_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_ledger_amount numeric;
  v_total numeric;
BEGIN
  IF NEW.ledger_entry_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT le.amount
    INTO v_ledger_amount
  FROM public.condominium_ledger_entries le
  WHERE le.id=NEW.ledger_entry_id
    AND le.workspace_id=NEW.workspace_id
    AND le.condominium_id=NEW.condominium_id
    AND le.direction='Uscita'
  FOR UPDATE;

  IF NOT FOUND OR v_ledger_amount IS NULL OR v_ledger_amount<=0 THEN
    RAISE EXCEPTION 'Movimento contabile della rata non valido';
  END IF;

  SELECT coalesce(sum(i.amount),0)
    INTO v_total
  FROM public.condominium_installments i
  WHERE i.ledger_entry_id=NEW.ledger_entry_id
    AND i.workspace_id=NEW.workspace_id
    AND i.condominium_id=NEW.condominium_id
    AND i.id IS DISTINCT FROM NEW.id;

  IF round(v_total+NEW.amount,2)>round(v_ledger_amount,2)+0.005 THEN
    RAISE EXCEPTION 'Il totale delle rate supera l''importo della spesa';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_installment_total
  ON public.condominium_installments;
CREATE TRIGGER trg_validate_installment_total
BEFORE INSERT OR UPDATE ON public.condominium_installments
FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_installment_total();
SQL

# Reproduce the full legacy lock-order cycle for opposite-direction moves.
# The BEFORE installment-total trigger locks only NEW.ledger_entry_id, while
# the closed-year guard holds each installment's fiscal-year row. The AFTER
# status trigger then requests both ledger parents in UUID order; updating the
# second ledger also waits on the other transaction's fiscal-year row.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.condominium_fiscal_years
  (id, workspace_id, condominium_id, start_date, end_date, status)
VALUES
  ('00000000-0000-0000-0000-000000000082',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   current_date - 365, current_date + 365, 'Aperto')
ON CONFLICT (id) DO UPDATE
SET status='Aperto', start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date;

INSERT INTO public.condominium_ledger_entries
  (id, workspace_id, condominium_id, fiscal_year_id, direction, amount, payment_status)
VALUES
  ('90000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000081',
   'Uscita', 100.00, 'Registrato'),
  ('90000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000082',
   'Uscita', 100.00, 'Registrato');

INSERT INTO public.condominium_installments
  (id, workspace_id, condominium_id, fiscal_year_id, ledger_entry_id, amount, paid_amount, due_date)
VALUES
  ('90000000-0000-0000-0000-000000000130',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000081',
   '90000000-0000-0000-0000-000000000030',
   50.00, 10.00, current_date + 30),
  ('90000000-0000-0000-0000-000000000131',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000080',
   '00000000-0000-0000-0000-000000000082',
   '90000000-0000-0000-0000-000000000031',
   50.00, 20.00, current_date + 30);
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE OR REPLACE FUNCTION public.test_pause_installment_before_status_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE NOTICE 'CROSS_LEDGER_LOCK_ORDER_REPRODUCTION:%', NEW.id;
  PERFORM pg_sleep(3);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_zz_test_pause_installment_before_status_sync
  ON public.condominium_installments;
CREATE TRIGGER trg_zz_test_pause_installment_before_status_sync
BEFORE UPDATE OF ledger_entry_id
ON public.condominium_installments
FOR EACH ROW
EXECUTE FUNCTION public.test_pause_installment_before_status_sync();
SQL

first_app="cross_ledger_move_first"
second_app="cross_ledger_move_second"
first_log="$tmp_dir/cross-ledger-first.log"
second_log="$tmp_dir/cross-ledger-second.log"

PGAPPNAME="$first_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<'SQL' &
BEGIN;
UPDATE public.condominium_installments
SET ledger_entry_id='90000000-0000-0000-0000-000000000031'
WHERE id='90000000-0000-0000-0000-000000000130';
COMMIT;
SQL
first_pid=$!
wait_for_marker "$first_log" "CROSS_LEDGER_LOCK_ORDER_REPRODUCTION:90000000-0000-0000-0000-000000000130" "$first_pid"

PGAPPNAME="$second_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<'SQL' &
BEGIN;
UPDATE public.condominium_installments
SET ledger_entry_id='90000000-0000-0000-0000-000000000030'
WHERE id='90000000-0000-0000-0000-000000000131';
COMMIT;
SQL
second_pid=$!
wait_for_marker "$second_log" "CROSS_LEDGER_LOCK_ORDER_REPRODUCTION:90000000-0000-0000-0000-000000000131" "$second_pid"

first_status=0
second_status=0
if wait "$first_pid"; then first_status=0; else first_status=$?; fi
if wait "$second_pid"; then second_status=0; else second_status=$?; fi

if [[ "$first_status" -ne 0 || "$second_status" -ne 0 ]] \
  && { grep -qi "deadlock detected" "$first_log" || grep -qi "deadlock detected" "$second_log"; }; then
  echo "CROSS_LEDGER_LOCK_ORDER_DEFECT_REPRODUCED: opposite-direction installment moves deadlocked under the current full trigger chain"
else
  cat "$first_log"
  cat "$second_log"
  echo "Expected cross-ledger lock-order deadlock was not reproduced (first=$first_status second=$second_status)"
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP TRIGGER IF EXISTS trg_zz_test_pause_installment_before_status_sync
  ON public.condominium_installments;
DROP FUNCTION IF EXISTS public.test_pause_installment_before_status_sync();
SQL

# Apply the focused fix: nested payment_status-only updates from the installment
# AFTER trigger must not reacquire fiscal-year locks after the ledger locks.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f \
  "supabase/rebuild/candidates/accounting-point1-20261124/20261124233700_allow_derived_installment_status_refresh.sql"

# Restore the two rows to their original ledgers and use distinguishable
# payment totals so both aggregate results can be checked after the move.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE public.condominium_installments
SET ledger_entry_id='90000000-0000-0000-0000-000000000030',
    paid_amount=0
WHERE id='90000000-0000-0000-0000-000000000130';

UPDATE public.condominium_installments
SET ledger_entry_id='90000000-0000-0000-0000-000000000031',
    paid_amount=50
WHERE id='90000000-0000-0000-0000-000000000131';
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE OR REPLACE FUNCTION public.test_pause_installment_before_status_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE NOTICE 'CROSS_LEDGER_LOCK_ORDER_FIXED:%', NEW.id;
  PERFORM pg_sleep(3);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_zz_test_pause_installment_before_status_sync
BEFORE UPDATE OF ledger_entry_id
ON public.condominium_installments
FOR EACH ROW
EXECUTE FUNCTION public.test_pause_installment_before_status_sync();
SQL

: >"$first_log"
: >"$second_log"
first_app="cross_ledger_move_fixed_first"
second_app="cross_ledger_move_fixed_second"

PGAPPNAME="$first_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<'SQL' &
BEGIN;
UPDATE public.condominium_installments
SET ledger_entry_id='90000000-0000-0000-0000-000000000031'
WHERE id='90000000-0000-0000-0000-000000000130';
COMMIT;
SQL
first_pid=$!
wait_for_marker "$first_log" "CROSS_LEDGER_LOCK_ORDER_FIXED:90000000-0000-0000-0000-000000000130" "$first_pid"

PGAPPNAME="$second_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<'SQL' &
BEGIN;
UPDATE public.condominium_installments
SET ledger_entry_id='90000000-0000-0000-0000-000000000030'
WHERE id='90000000-0000-0000-0000-000000000131';
COMMIT;
SQL
second_pid=$!
wait_for_marker "$second_log" "CROSS_LEDGER_LOCK_ORDER_FIXED:90000000-0000-0000-0000-000000000131" "$second_pid"

first_status=0
second_status=0
if wait "$first_pid"; then first_status=0; else first_status=$?; fi
if wait "$second_pid"; then second_status=0; else second_status=$?; fi
if [[ "$first_status" -ne 0 || "$second_status" -ne 0 ]]; then
  cat "$first_log"
  cat "$second_log"
  echo "Cross-ledger moves still failed after the nested status-refresh guard (first=$first_status second=$second_status)"
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $verify$
BEGIN
  IF (SELECT ledger_entry_id FROM public.condominium_installments
      WHERE id='90000000-0000-0000-0000-000000000130')
      <> '90000000-0000-0000-0000-000000000031'::uuid
     OR (SELECT ledger_entry_id FROM public.condominium_installments
      WHERE id='90000000-0000-0000-0000-000000000131')
      <> '90000000-0000-0000-0000-000000000030'::uuid THEN
    RAISE EXCEPTION 'Both opposite-direction installment moves must commit';
  END IF;
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='90000000-0000-0000-0000-000000000030') <> 'Pagato' THEN
    RAISE EXCEPTION 'Source ledger aggregate was not refreshed after cross-ledger move';
  END IF;
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='90000000-0000-0000-0000-000000000031') <> 'Da pagare' THEN
    RAISE EXCEPTION 'Destination ledger aggregate was not refreshed after cross-ledger move';
  END IF;
END
$verify$;
SQL

echo "CROSS_LEDGER_LOCK_ORDER_FIXED: both opposite-direction moves committed and both ledger aggregates were refreshed"

DO $amount_guard$
BEGIN
  BEGIN
    UPDATE public.condominium_installments
    SET amount=101
    WHERE id='90000000-0000-0000-0000-000000000130';
    RAISE EXCEPTION 'TEST_EXPECTED_INSTALLMENT_TOTAL_OVERFLOW_BLOCK_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_INSTALLMENT_TOTAL_OVERFLOW_BLOCK_NOT_RAISED' THEN
      RAISE;
    END IF;
    IF SQLERRM <> 'Il totale delle rate supera l''importo della spesa' THEN
      RAISE;
    END IF;
  END;
END
$amount_guard$;

echo "PASS: installment-total ceiling remains enforced after deterministic parent locking"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP TRIGGER IF EXISTS trg_zz_test_pause_installment_before_status_sync
  ON public.condominium_installments;
DROP FUNCTION IF EXISTS public.test_pause_installment_before_status_sync();

UPDATE public.condominium_fiscal_years
SET status='Chiuso'
WHERE id='00000000-0000-0000-0000-000000000081';

DO $direct_guard$
BEGIN
  BEGIN
    UPDATE public.condominium_ledger_entries
    SET payment_status='Parzialmente pagato'
    WHERE id='90000000-0000-0000-0000-000000000030';
    RAISE EXCEPTION 'TEST_EXPECTED_DIRECT_CLOSED_LEDGER_STATUS_UPDATE_BLOCK_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_DIRECT_CLOSED_LEDGER_STATUS_UPDATE_BLOCK_NOT_RAISED' THEN
      RAISE;
    END IF;
    IF SQLERRM <> 'L''esercizio contabile di origine è chiuso: modifica non consentita.' THEN
      RAISE;
    END IF;
  END;
END
$direct_guard$;

-- The parent ledger is in a closed year, but this installment belongs to the
-- other open year. Its nested, derived status refresh must remain possible.
UPDATE public.condominium_installments
SET paid_amount=40
WHERE id='90000000-0000-0000-0000-000000000131';

DO $derived_guard$
BEGIN
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='90000000-0000-0000-0000-000000000030') <> 'Parzialmente pagato' THEN
    RAISE EXCEPTION 'Nested derived payment-status refresh should be allowed for a valid open-year installment';
  END IF;
END
$derived_guard$;

UPDATE public.condominium_fiscal_years
SET status='Aperto'
WHERE id='00000000-0000-0000-0000-000000000081';
SQL

echo "PASS: direct closed-year ledger mutation remains blocked; nested derived payment-status refresh succeeds"
echo "Installment payment-status concurrency PostgreSQL regression: PASS"
