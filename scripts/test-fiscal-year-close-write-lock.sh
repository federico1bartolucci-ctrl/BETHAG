#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
migration="supabase/migrations/20261124240600_lock_fiscal_year_parent_rows.sql"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.condominium_fiscal_years (id uuid PRIMARY KEY, status text NOT NULL);
CREATE TABLE public.condominium_ledger_entries (id uuid PRIMARY KEY, fiscal_year_id uuid);
CREATE TABLE public.condominium_budgets (fiscal_year_id uuid);
CREATE TABLE public.condominium_installments (id uuid PRIMARY KEY, fiscal_year_id uuid);
CREATE TABLE public.condominium_expense_allocations (id uuid PRIMARY KEY, ledger_entry_id uuid);
CREATE TABLE public.condominium_payment_movements (id uuid PRIMARY KEY, installment_id uuid);

-- Install the previous implementation first, so the test proves the defect
-- before applying the corrected migration. This version reads the parent
-- fiscal_year_id without locking the parent row.
CREATE OR REPLACE FUNCTION public.prevent_closed_condominium_accounting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_year_id uuid;
  v_new_year_id uuid;
  v_old_status text;
  v_new_status text;
  v_old_parent_id uuid;
  v_new_parent_id uuid;
  v_year record;
begin
  if tg_table_name in ('condominium_ledger_entries','condominium_budgets','condominium_installments') then
    if tg_op <> 'INSERT' then v_old_year_id := old.fiscal_year_id; end if;
    if tg_op <> 'DELETE' then v_new_year_id := new.fiscal_year_id; end if;

  elsif tg_table_name = 'condominium_expense_allocations' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.ledger_entry_id;
      select le.fiscal_year_id into v_old_year_id
      from public.condominium_ledger_entries le where le.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
      select le.fiscal_year_id into v_new_year_id
      from public.condominium_ledger_entries le where le.id = v_new_parent_id;
    end if;

  elsif tg_table_name = 'condominium_payment_movements' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.installment_id;
      select i.fiscal_year_id into v_old_year_id
      from public.condominium_installments i where i.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.installment_id;
      select i.fiscal_year_id into v_new_year_id
      from public.condominium_installments i where i.id = v_new_parent_id;
    end if;
  end if;

  for v_year in
    select fy.id, fy.status
    from public.condominium_fiscal_years fy
    where fy.id = v_old_year_id or fy.id = v_new_year_id
    order by fy.id
    for update
  loop
    if v_year.id = v_old_year_id then v_old_status := v_year.status; end if;
    if v_year.id = v_new_year_id then v_new_status := v_year.status; end if;
  end loop;

  if v_old_year_id is not null and v_old_status = 'Chiuso' then
    raise exception 'L''esercizio contabile di origine è chiuso: modifica non consentita.';
  end if;
  if v_new_year_id is not null
     and v_new_year_id is distinct from v_old_year_id
     and v_new_status = 'Chiuso' then
    raise exception 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TRIGGER trg_block_closed_ledger
BEFORE INSERT OR UPDATE OR DELETE ON public.condominium_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();
CREATE TRIGGER trg_block_closed_budgets
BEFORE INSERT OR UPDATE OR DELETE ON public.condominium_budgets
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();
CREATE TRIGGER trg_block_closed_installments
BEFORE INSERT OR UPDATE OR DELETE ON public.condominium_installments
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();
CREATE TRIGGER trg_block_closed_allocations
BEFORE INSERT OR UPDATE OR DELETE ON public.condominium_expense_allocations
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();
CREATE TRIGGER trg_block_closed_payments
BEFORE INSERT OR UPDATE OR DELETE ON public.condominium_payment_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_condominium_accounting();

INSERT INTO public.condominium_fiscal_years(id,status)
VALUES
 ('10000000-0000-0000-0000-000000000001','Aperto'),
 ('10000000-0000-0000-0000-000000000002','Aperto'),
 ('10000000-0000-0000-0000-000000000003','Aperto'),
 ('10000000-0000-0000-0000-000000000004','Aperto'),
 ('10000000-0000-0000-0000-000000000005','Aperto'),
 ('10000000-0000-0000-0000-000000000006','Aperto'),
 ('10000000-0000-0000-0000-000000000007','Aperto'),
 ('10000000-0000-0000-0000-000000000008','Aperto');

INSERT INTO public.condominium_ledger_entries(id,fiscal_year_id)
VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003'),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000007');

INSERT INTO public.condominium_installments(id,fiscal_year_id)
VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000005'),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002');

-- Ordinary child writes in an open fiscal year remain allowed.
INSERT INTO public.condominium_expense_allocations(id,ledger_entry_id)
VALUES ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');
INSERT INTO public.condominium_payment_movements(id,installment_id)
VALUES ('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003');
SQL

wait_for_marker() {
  local log_file="$1"
  local marker="$2"
  local pid="$3"
  for attempt in {1..160}; do
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
  for attempt in {1..160}; do
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

run_parent_move_close_race() {
  local label="$1"
  local parent_table="$2"
  local parent_id="$3"
  local to_year="$4"
  local child_sql="$5"
  local child_table="$6"
  local child_id="$7"
  local expected="$8"

  local move_app="$label"_move
  local close_app="$label"_close
  local child_app="$label"_child
  local move_log="$tmp_dir/$label-move.log"
  local close_log="$tmp_dir/$label-close.log"
  local child_log="$tmp_dir/$label-child.log"

  PGAPPNAME="$move_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$move_log" 2>&1 <<SQL &
BEGIN;
UPDATE public.$parent_table SET fiscal_year_id='$to_year' WHERE id='$parent_id';
\echo PARENT_MOVE_LOCKS_HELD
SELECT pg_sleep(8);
COMMIT;
SQL
  local move_pid=$!
  wait_for_marker "$move_log" "PARENT_MOVE_LOCKS_HELD" "$move_pid"

  PGAPPNAME="$close_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$close_log" 2>&1 <<SQL &
BEGIN;
SELECT id FROM public.condominium_fiscal_years WHERE id='$to_year' FOR UPDATE;
UPDATE public.condominium_fiscal_years SET status='Chiuso' WHERE id='$to_year';
\echo TARGET_CLOSE_LOCK_HELD
SELECT pg_sleep(3);
COMMIT;
SQL
  local close_pid=$!
  wait_for_lock_waiter "$close_app" "$close_log" "$close_pid"

  PGAPPNAME="$child_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$child_log" 2>&1 <<SQL &
BEGIN;
$child_sql
COMMIT;
SQL
  local child_pid=$!
  wait_for_lock_waiter "$child_app" "$child_log" "$child_pid"

  wait "$move_pid"
  wait_for_marker "$close_log" "TARGET_CLOSE_LOCK_HELD" "$close_pid"

  local child_status=0
  if wait "$child_pid"; then
    child_status=0
  else
    child_status=$?
  fi
  wait "$close_pid"

  if [[ "$expected" == "allowed" ]]; then
    if [[ "$child_status" -ne 0 ]]; then
      cat "$child_log"
      echo "Legacy implementation did not reproduce the expected unsafe child write: $label"
      return 1
    fi
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
DO \$verify\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.$child_table WHERE id='$child_id') THEN
    RAISE EXCEPTION 'Legacy reproduction did not persist the child row: $label';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.$parent_table WHERE id='$parent_id' AND fiscal_year_id='$to_year') THEN
    RAISE EXCEPTION 'Parent fiscal-year move did not commit: $label';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_fiscal_years WHERE id='$to_year' AND status='Chiuso') THEN
    RAISE EXCEPTION 'Target fiscal year did not close: $label';
  END IF;
END
\$verify\$;
SQL
    echo "LEGACY DEFECT REPRODUCED: child row persisted in the now-closed fiscal year ($label)"
    return 0
  fi

  if [[ "$child_status" -eq 0 ]]; then
    cat "$child_log"
    echo "Child write unexpectedly succeeded while its parent moved into a closing fiscal year: $label"
    return 1
  fi
  grep -F "L'esercizio contabile di destinazione è chiuso: modifica non consentita." "$child_log"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
DO \$verify\$
BEGIN
  IF EXISTS (SELECT 1 FROM public.$child_table WHERE id='$child_id') THEN
    RAISE EXCEPTION 'Child row persisted during fiscal-year closure: $label';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.$parent_table WHERE id='$parent_id' AND fiscal_year_id='$to_year') THEN
    RAISE EXCEPTION 'Parent fiscal-year move did not commit: $label';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_fiscal_years WHERE id='$to_year' AND status='Chiuso') THEN
    RAISE EXCEPTION 'Target fiscal year did not close: $label';
  END IF;
END
\$verify\$;
SQL
}

# Reproduce the old race: a child allocation is accepted after its parent
# moves into a target fiscal year that is being closed.
run_parent_move_close_race \
  "legacy_allocation" \
  "condominium_ledger_entries" \
  "20000000-0000-0000-0000-000000000004" \
  "10000000-0000-0000-0000-000000000008" \
  "INSERT INTO public.condominium_expense_allocations(id,ledger_entry_id) VALUES ('40000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000004');" \
  "condominium_expense_allocations" \
  "40000000-0000-0000-0000-000000000010" \
  "allowed"

# Apply the corrected implementation after the legacy reproduction.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE public.condominium_fiscal_years
SET status='Chiuso'
WHERE id='10000000-0000-0000-0000-000000000001';

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.condominium_expense_allocations(id,ledger_entry_id)
    VALUES ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST_EXPECTED_CLOSED_ALLOCATION_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_CLOSED_ALLOCATION_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.condominium_payment_movements(id,installment_id)
    VALUES ('50000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST_EXPECTED_CLOSED_PAYMENT_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_CLOSED_PAYMENT_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.condominium_ledger_entries(id,fiscal_year_id)
    VALUES ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST_EXPECTED_CLOSED_LEDGER_REJECTION_NOT_RAISED';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='TEST_EXPECTED_CLOSED_LEDGER_REJECTION_NOT_RAISED' THEN RAISE; END IF;
    IF SQLERRM <> 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.' THEN RAISE; END IF;
  END;
END
$test$;

-- Ordinary child writes in an open year remain allowed after the fix.
INSERT INTO public.condominium_expense_allocations(id,ledger_entry_id)
VALUES ('40000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000002');
INSERT INTO public.condominium_payment_movements(id,installment_id)
VALUES ('50000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000003');
SQL

# The corrected trigger must reject both concurrent child-write races.
run_parent_move_close_race \
  "allocation_parent" \
  "condominium_ledger_entries" \
  "20000000-0000-0000-0000-000000000003" \
  "10000000-0000-0000-0000-000000000004" \
  "INSERT INTO public.condominium_expense_allocations(id,ledger_entry_id) VALUES ('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003');" \
  "condominium_expense_allocations" \
  "40000000-0000-0000-0000-000000000003" \
  "rejected"

run_parent_move_close_race \
  "payment_parent" \
  "condominium_installments" \
  "30000000-0000-0000-0000-000000000002" \
  "10000000-0000-0000-0000-000000000006" \
  "INSERT INTO public.condominium_payment_movements(id,installment_id) VALUES ('50000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002');" \
  "condominium_payment_movements" \
  "50000000-0000-0000-0000-000000000003" \
  "rejected"

echo "Fiscal-year parent-row serialization regression: PASS"
