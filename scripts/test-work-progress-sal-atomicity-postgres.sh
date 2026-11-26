#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*|*::1*) ;;
  *) echo "Refusing non-loopback DATABASE_URL" >&2; exit 1 ;;
esac
case "$DATABASE_URL" in
  *supabase.co*|*tctcgptrsmvgajqjgnev*|*jhuyhlzzydcgghrzeexn*)
    echo "Refusing remote Supabase/Production DATABASE_URL" >&2
    exit 1
    ;;
esac

migration="supabase/rebuild/proposed-forward-migrations/20261123050000_atomic_work_progress_payment_registration.sql"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;
DROP FUNCTION IF EXISTS public.test_pause_first_sal_insert() CASCADE;
DROP FUNCTION IF EXISTS public.test_pause_first_sal_payment() CASCADE;

DROP TABLE IF EXISTS public.condominium_work_events CASCADE;
DROP TABLE IF EXISTS public.condominium_work_progress CASCADE;
DROP TABLE IF EXISTS public.condominium_ledger_entries CASCADE;
DROP TABLE IF EXISTS public.condominium_fiscal_years CASCADE;
DROP TABLE IF EXISTS public.condominium_works CASCADE;

CREATE TABLE public.condominium_works (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  title text NOT NULL,
  supplier_id uuid,
  approved_amount numeric NOT NULL DEFAULT 0,
  progress_percent numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.condominium_fiscal_years (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL
);
CREATE TABLE public.condominium_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  fiscal_year_id uuid,
  entry_date date NOT NULL,
  direction text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  payment_status text NOT NULL,
  due_date date,
  supplier_id uuid,
  notes text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.condominium_work_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  work_id uuid NOT NULL,
  progress_no integer NOT NULL,
  progress_date date NOT NULL,
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Presentato',
  percentage numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  ledger_entry_id uuid,
  payment_entry_id uuid,
  UNIQUE(work_id, progress_no),
  CHECK(amount >= 0 AND paid_amount >= 0 AND paid_amount <= amount),
  CHECK(progress_no > 0 AND percentage >= 0 AND percentage <= 100)
);
CREATE TABLE public.condominium_work_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  work_id uuid NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
SQL

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$migration"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE TRIGGER validate_condominium_work_progress_accounting_links
BEFORE INSERT OR UPDATE ON public.condominium_work_progress
FOR EACH ROW
EXECUTE FUNCTION public.validate_condominium_work_progress_accounting_links();

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.condominium_works,
  public.condominium_fiscal_years, public.condominium_ledger_entries,
  public.condominium_work_progress, public.condominium_work_events TO authenticated;

INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title,approved_amount)
VALUES ('33333333-3333-4333-8333-333333333333',
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'Intervento concorrente',100),
       ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        'Intervento pagamento',100);
INSERT INTO public.condominium_fiscal_years(id,workspace_id,condominium_id,start_date,end_date,status)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        current_date - 365, current_date + 365, 'Aperto');
CREATE FUNCTION public.test_pause_first_sal_insert()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.title = 'Race SAL first' THEN
    RAISE NOTICE 'FIRST_SAL_INSERT_HELD';
    PERFORM pg_sleep(3);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER aaa_test_pause_first_sal_insert
BEFORE INSERT ON public.condominium_work_progress
FOR EACH ROW
EXECUTE FUNCTION public.test_pause_first_sal_insert();
SQL

first_log="$(mktemp)"
second_log="$(mktemp)"
trap 'rm -f "$first_log" "$second_log"' EXIT

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SELECT public.create_condominium_work_progress_atomic(
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  1, current_date, 'Race SAL first', 'Presentato', 40, 60, 0, ''
);
RESET ROLE;
SQL
first_pid=$!

for attempt in $(seq 1 100); do
  if grep -q "FIRST_SAL_INSERT_HELD" "$first_log"; then break; fi
  if ! kill -0 "$first_pid" 2>/dev/null; then
    wait "$first_pid" || true
    cat "$first_log"
    echo "First SAL transaction exited before holding the work lock" >&2
    exit 1
  fi
  sleep 0.05
done
if ! grep -q "FIRST_SAL_INSERT_HELD" "$first_log"; then
  kill "$first_pid" 2>/dev/null || true
  wait "$first_pid" || true
  cat "$first_log"
  echo "Did not observe the first SAL transaction holding the work lock" >&2
  exit 1
fi

if psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<'SQL'
SET ROLE authenticated;
SELECT public.create_condominium_work_progress_atomic(
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  2, current_date, 'Race SAL second', 'Presentato', 40, 60, 0, ''
);
RESET ROLE;
SQL
then
  wait "$first_pid"
  echo "Concurrent SAL creation unexpectedly exceeded the approved amount" >&2
  cat "$second_log"
  exit 1
fi

wait "$first_pid"
grep -F "Il totale dei SAL supera l'importo approvato del lavoro" "$second_log"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.condominium_work_progress
      WHERE work_id='33333333-3333-4333-8333-333333333333') <> 1 THEN
    RAISE EXCEPTION 'Concurrent SAL race persisted more than one row';
  END IF;
  IF (SELECT round(sum(amount),2) FROM public.condominium_work_progress
      WHERE work_id='33333333-3333-4333-8333-333333333333') <> 60 THEN
    RAISE EXCEPTION 'Concurrent SAL race exceeded approved cumulative amount';
  END IF;
  IF (SELECT progress_percent FROM public.condominium_works
      WHERE id='33333333-3333-4333-8333-333333333333') <> 40 THEN
    RAISE EXCEPTION 'Work progress summary was not committed atomically';
  END IF;
END
$verify$;
SQL

# Verify concurrent retries of the same partial payment return one ledger movement.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.condominium_work_progress(
  id,workspace_id,condominium_id,work_id,progress_no,progress_date,title,status,percentage,amount,paid_amount
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  1,current_date,'SAL pagamento concorrente','Presentato',40,100,0
);
CREATE FUNCTION public.test_pause_first_sal_payment()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.category = 'Pagamento SAL' THEN
    RAISE NOTICE 'FIRST_SAL_PAYMENT_HELD';
    PERFORM pg_sleep(3);
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER aaa_test_pause_first_sal_payment
BEFORE INSERT ON public.condominium_ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.test_pause_first_sal_payment();
SQL

payment_first_log="$(mktemp)"
payment_second_log="$(mktemp)"
trap 'rm -f "$first_log" "$second_log" "$payment_first_log" "$payment_second_log"' EXIT

psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 >"$payment_first_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SELECT public.register_condominium_work_progress_payment(
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  current_date,40,'partial-race-key','concurrent retry test'
);
RESET ROLE;
SQL
payment_first_pid=$!

for attempt in $(seq 1 100); do
  if grep -q "FIRST_SAL_PAYMENT_HELD" "$payment_first_log"; then break; fi
  if ! kill -0 "$payment_first_pid" 2>/dev/null; then
    wait "$payment_first_pid" || true
    cat "$payment_first_log"
    echo "First partial-payment transaction exited before holding the work lock" >&2
    exit 1
  fi
  sleep 0.05
done
if ! grep -q "FIRST_SAL_PAYMENT_HELD" "$payment_first_log"; then
  kill "$payment_first_pid" 2>/dev/null || true
  wait "$payment_first_pid" || true
  cat "$payment_first_log"
  echo "Did not observe the first partial-payment transaction holding the work lock" >&2
  exit 1
fi

psql "$DATABASE_URL" -X -qAt -v ON_ERROR_STOP=1 >"$payment_second_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SELECT public.register_condominium_work_progress_payment(
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  current_date,40,'partial-race-key','concurrent retry test'
);
RESET ROLE;
SQL
payment_second_pid=$!
wait "$payment_first_pid"
wait "$payment_second_pid"

payment_first_id="$(grep -Eo '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
 "$payment_first_log" | tail -n 1)"
payment_second_id="$(grep -Eo '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
 "$payment_second_log" | tail -n 1)"
if [ -z "$payment_first_id" ] || [ "$payment_first_id" != "$payment_second_id" ]; then
  cat "$payment_first_log" "$payment_second_log"
  echo "Concurrent retries did not return the same ledger movement" >&2
  exit 1
fi

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
DO $verify_payment$
BEGIN
  IF (SELECT count(*) FROM public.condominium_ledger_entries
      WHERE data->>'idempotencyKey'='partial-race-key') <> 1 THEN
    RAISE EXCEPTION 'Idempotent partial-payment retry created duplicate ledger rows';
  END IF;
  IF (SELECT paid_amount FROM public.condominium_work_progress
      WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') <> 40 THEN
    RAISE EXCEPTION 'Idempotent partial-payment retry changed the paid amount more than once';
  END IF;
  IF (SELECT count(*) FROM public.condominium_work_events
      WHERE data->>'idempotencyKey'='partial-race-key') <> 1 THEN
    RAISE EXCEPTION 'Idempotent partial-payment retry created duplicate work events';
  END IF;
END
$verify_payment$;
DROP TRIGGER aaa_test_pause_first_sal_payment ON public.condominium_ledger_entries;
DROP FUNCTION public.test_pause_first_sal_payment();
SQL

