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

echo "Installment payment-status concurrency PostgreSQL regression: PASS"
