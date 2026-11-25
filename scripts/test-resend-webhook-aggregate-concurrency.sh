#!/usr/bin/env bash
set -euo pipefail

: "\${DATABASE_URL:?DATABASE_URL is required}"

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
legacy_migration="$repo_root/supabase/rebuild/proposed-forward-migrations/20261123090000_guard_resend_webhook_status_event_order.sql"
fixed_migration="$repo_root/supabase/rebuild/proposed-forward-migrations/20261125054500_serialize_resend_webhook_communication_aggregate.sql"
tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

for file in "$legacy_migration" "$fixed_migration"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing migration: $file"
    exit 1
  fi
done

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
DROP TABLE IF EXISTS public.communication_recipients CASCADE;
DROP TABLE IF EXISTS public.communications CASCADE;
DROP SCHEMA IF EXISTS private CASCADE;
CREATE SCHEMA private;

CREATE TABLE public.communications (
  id uuid PRIMARY KEY,
  email_status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.communication_recipients (
  id uuid PRIMARY KEY,
  communication_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL,
  provider_message_id text NOT NULL,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  updated_at timestamptz,
  event_type text,
  provider_event_id text
);

CREATE UNIQUE INDEX communication_recipients_provider_event_uq
  ON public.communication_recipients(provider_event_id)
  WHERE provider_event_id IS NOT NULL;
SQL

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$legacy_migration"

seed_fixture() {
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
TRUNCATE public.communication_recipients, public.communications;
INSERT INTO public.communications(id, email_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'In elaborazione');

INSERT INTO public.communication_recipients(
  id, communication_id, email, status, provider_message_id, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'resident-a@example.test', 'queued', 'message-a', now()),
  ('00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'resident-b@example.test', 'queued', 'message-b', now());
SQL
}

wait_for_marker() {
  local log_file="$1"
  local marker="$2"
  local pid="$3"
  for attempt in $(seq 1 200); do
    if grep -qF "$marker" "$log_file" 2>/dev/null; then return 0; fi
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
  for attempt in $(seq 1 200); do
    local waiting
    waiting="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
      -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$app_name' AND wait_event_type='Lock'")"
    if [[ "$waiting" =~ ^[1-9][0-9]*$ ]]; then return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      cat "$log_file"
      echo "Process exited before expected communication lock wait: $app_name"
      return 1
    fi
    sleep 0.05
  done
  cat "$log_file"
  echo "Timed out waiting for communication lock: $app_name"
  return 1
}

run_race() {
  local label="$1"
  local expected="$2"
  local lock_app="\${label}_parent_lock"
  local first_app="\${label}_event_a"
  local second_app="\${label}_event_b"
  local lock_log="$tmp_dir/$label-lock.log"
  local first_log="$tmp_dir/$label-event-a.log"
  local second_log="$tmp_dir/$label-event-b.log"

  PGAPPNAME="$lock_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$lock_log" 2>&1 <<'SQL' &
BEGIN;
SELECT id FROM public.communications
WHERE id='00000000-0000-0000-0000-000000000001'
FOR UPDATE;
\echo PARENT_LOCK_HELD
SELECT pg_sleep(12);
COMMIT;
SQL
  local lock_pid=$!
  wait_for_marker "$lock_log" "PARENT_LOCK_HELD" "$lock_pid"

  PGAPPNAME="$first_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$first_log" 2>&1 <<'SQL' &
BEGIN;
SELECT private.apply_resend_communication_event(
  'message-a', 'event-a-delivered', 'email.delivered',
  'resident-a@example.test', '2026-11-25T04:00:00Z'
);
COMMIT;
SQL
  local first_pid=$!

  PGAPPNAME="$second_app" psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$second_log" 2>&1 <<'SQL' &
BEGIN;
SELECT private.apply_resend_communication_event(
  'message-b', 'event-b-delivered', 'email.delivered',
  'resident-b@example.test', '2026-11-25T04:01:00Z'
);
COMMIT;
SQL
  local second_pid=$!

  wait_for_lock_waiter "$first_app" "$first_log" "$first_pid"
  wait_for_lock_waiter "$second_app" "$second_log" "$second_pid"

  wait "$lock_pid"
  wait "$first_pid" || { cat "$first_log"; return 1; }
  wait "$second_pid" || { cat "$second_log"; return 1; }

  local delivered_count aggregate
  delivered_count="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
    -c "SELECT count(*) FROM public.communication_recipients WHERE status='delivered'")"
  aggregate="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
    -c "SELECT email_status FROM public.communications WHERE id='00000000-0000-0000-0000-000000000001'")"

  if [[ "$delivered_count" != "2" ]]; then
    echo "Unexpected delivered recipient count for $label: $delivered_count"
    return 1
  fi

  if [[ "$expected" == "legacy-stale" ]]; then
    if [[ "$aggregate" != "In elaborazione" ]]; then
      echo "Legacy race did not reproduce: recipients=$delivered_count aggregate=$aggregate"
      return 1
    fi
    echo "LEGACY DEFECT REPRODUCED: both recipients delivered, communication aggregate remained In elaborazione."
    return 0
  fi

  if [[ "$aggregate" != "Consegnata" ]]; then
    echo "Fixed aggregate remained stale: recipients=$delivered_count aggregate=$aggregate"
    return 1
  fi
  echo "PASS: concurrent webhook events serialize; both recipients and communication aggregate are Consegnata."
}

seed_fixture
run_race "legacy_resend_aggregate" "legacy-stale"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$fixed_migration"

seed_fixture
run_race "fixed_resend_aggregate" "fixed"
