#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

migration="supabase/rebuild/proposed-forward-migrations/20261125084700_guard_last_active_workspace_admin_removal.sql"
tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY
);
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','collaborator','resident','council')),
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (workspace_id,user_id)
);

INSERT INTO public.workspaces(id) VALUES
  ('10000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-000000000012');
INSERT INTO public.profiles(id) VALUES
  ('20000000-0000-4000-8000-000000000011'),
  ('20000000-0000-4000-8000-000000000012'),
  ('20000000-0000-4000-8000-000000000013'),
  ('20000000-0000-4000-8000-000000000014');
INSERT INTO public.workspace_members(workspace_id,user_id,role,active) VALUES
  ('10000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','admin',true),
  ('10000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000012','admin',true),
  ('10000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000013','admin',true),
  ('10000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000014','admin',true);
SQL

wait_for_marker() {
  local log_file="$1" marker="$2" pid="$3"
  for attempt in {1..200}; do
    if grep -q "$marker" "$log_file"; then return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then cat "$log_file"; echo "Process exited before marker: $marker"; return 1; fi
    sleep 0.05
  done
  cat "$log_file"
  echo "Timed out waiting for marker: $marker"
  return 1
}

wait_for_lock_waiter() {
  local app_name="$1" log_file="$2" pid="$3"
  for attempt in {1..200}; do
    local waiting
    waiting="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
      -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$app_name' AND wait_event_type='Lock'")"
    if [[ "$waiting" =~ ^[1-9][0-9]*$ ]]; then return 0; fi
    if ! kill -0 "$pid" 2>/dev/null; then cat "$log_file"; echo "Process exited before lock wait: $app_name"; return 1; fi
    sleep 0.05
  done
  cat "$log_file"
  echo "Timed out waiting for PostgreSQL lock: $app_name"
  return 1
}

# Reproduce the non-atomic Edge Function precheck: both requests observe two
# admins before either Auth deletion cascades to profiles/workspace_members.
legacy_a_log="$tmp_dir/legacy-a.log"
legacy_b_log="$tmp_dir/legacy-b.log"
PGAPPNAME=legacy_admin_delete_a psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$legacy_a_log" 2>&1 <<'SQL' &
BEGIN;
SELECT count(*) FROM public.workspace_members
WHERE workspace_id='10000000-0000-4000-8000-000000000011' AND role='admin' AND active;
\echo LEGACY_A_CHECKED
SELECT pg_sleep(4);
DELETE FROM public.profiles WHERE id='20000000-0000-4000-8000-000000000011';
COMMIT;
SQL
legacy_a_pid=$!
wait_for_marker "$legacy_a_log" "LEGACY_A_CHECKED" "$legacy_a_pid"

PGAPPNAME=legacy_admin_delete_b psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$legacy_b_log" 2>&1 <<'SQL' &
BEGIN;
SELECT count(*) FROM public.workspace_members
WHERE workspace_id='10000000-0000-4000-8000-000000000011' AND role='admin' AND active;
\echo LEGACY_B_CHECKED
DELETE FROM public.profiles WHERE id='20000000-0000-4000-8000-000000000012';
COMMIT;
SQL
legacy_b_pid=$!
wait_for_marker "$legacy_b_log" "LEGACY_B_CHECKED" "$legacy_b_pid"
wait "$legacy_a_pid"
wait "$legacy_b_pid"

legacy_remaining="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM public.workspace_members WHERE workspace_id='10000000-0000-4000-8000-000000000011' AND role='admin' AND active")"
if [[ "$legacy_remaining" != "0" ]]; then
  echo "Expected legacy race to remove both admins, found $legacy_remaining"
  exit 1
fi
echo "LEGACY DEFECT REPRODUCED: two concurrent delete-account prechecks both passed and workspace was left with zero active administrators."

# The same race after the database guard: the second delete must wait for the
# workspace lock and then fail after the first transaction commits.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$migration"
guard_a_log="$tmp_dir/guard-a.log"
guard_b_log="$tmp_dir/guard-b.log"
PGAPPNAME=guarded_admin_delete_a psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$guard_a_log" 2>&1 <<'SQL' &
BEGIN;
DELETE FROM public.profiles WHERE id='20000000-0000-4000-8000-000000000013';
\echo GUARDED_A_DELETED
SELECT pg_sleep(4);
COMMIT;
SQL
guard_a_pid=$!
wait_for_marker "$guard_a_log" "GUARDED_A_DELETED" "$guard_a_pid"

PGAPPNAME=guarded_admin_delete_b psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$guard_b_log" 2>&1 <<'SQL' &
BEGIN;
DELETE FROM public.profiles WHERE id='20000000-0000-4000-8000-000000000014';
COMMIT;
SQL
guard_b_pid=$!
wait_for_lock_waiter "guarded_admin_delete_b" "$guard_b_log" "$guard_b_pid"

wait "$guard_a_pid"
set +e
wait "$guard_b_pid"
guard_b_status=$?
set -e
if [[ "$guard_b_status" -eq 0 ]]; then
  cat "$guard_b_log"
  echo "Guarded second deletion unexpectedly succeeded."
  exit 1
fi
if ! grep -q "LAST_ACTIVE_WORKSPACE_ADMIN" "$guard_b_log"; then
  cat "$guard_b_log"
  echo "Guarded second deletion failed for an unexpected reason."
  exit 1
fi

guard_remaining="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM public.workspace_members WHERE workspace_id='10000000-0000-4000-8000-000000000012' AND role='admin' AND active")"
guard_profiles="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM public.profiles WHERE id='20000000-0000-4000-8000-000000000014'")"
if [[ "$guard_remaining" != "1" || "$guard_profiles" != "1" ]]; then
  echo "Guarded race left inconsistent state: active_admins=$guard_remaining second_profile=$guard_profiles"
  exit 1
fi
echo "PASS: workspace row lock serialized concurrent Auth-delete cascades; the second last-admin deletion was rejected."

# Rehearse the follow-up single-statement precheck migration on real PostgreSQL 17.
# This script is already invoked by the existing postgres-bootstrap workflow;
# no workflow file or dispatch is needed for this additional regression.
precheck_migration="supabase/rebuild/proposed-forward-migrations/20261126052000_last_admin_precheck_single_statement.sql"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END
$roles$;
SQL
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$precheck_migration"

precheck_user="20000000-0000-4000-8000-000000000021"
coadmin_user="20000000-0000-4000-8000-000000000022"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.profiles(id) VALUES
  ('$precheck_user'),
  ('$coadmin_user');

INSERT INTO public.workspaces(id)
SELECT md5('bethag-last-admin-precheck-' || i::text)::uuid
FROM generate_series(1, 1205) AS i;

INSERT INTO public.workspace_members(workspace_id,user_id,role,active)
SELECT md5('bethag-last-admin-precheck-' || i::text)::uuid,
       '$precheck_user'::uuid, 'admin', true
FROM generate_series(1, 1205) AS i;

-- The second administrator is present in 1,204 workspaces. The target user
-- remains the sole active administrator in workspace 1,205.
INSERT INTO public.workspace_members(workspace_id,user_id,role,active)
SELECT md5('bethag-last-admin-precheck-' || i::text)::uuid,
       '$coadmin_user'::uuid, 'admin', true
FROM generate_series(1, 1204) AS i;
SQL

target_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT public.has_last_active_workspace_admin('$precheck_user'::uuid)")"
coadmin_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT public.has_last_active_workspace_admin('$coadmin_user'::uuid)")"
if [[ "$target_result" != "t" || "$coadmin_result" != "f" ]]; then
  echo "Single-statement precheck returned unexpected results: target=$target_result coadmin=$coadmin_result"
  exit 1
fi

acl_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 -c "
  SELECT
    has_function_privilege('service_role', 'public.has_last_active_workspace_admin(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.has_last_active_workspace_admin(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.has_last_active_workspace_admin(uuid)', 'EXECUTE')
")"
if [[ "$acl_result" != "t" ]]; then
  echo "Single-statement precheck RPC grants are not service-role-only."
  exit 1
fi

service_role_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 -c "
  SET ROLE service_role;
  SELECT public.has_last_active_workspace_admin('$precheck_user'::uuid);
  RESET ROLE;
" | tail -n 1)"
if [[ "$service_role_result" != "t" ]]; then
  echo "service_role could not execute the last-admin precheck RPC."
  exit 1
fi

if psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
  SET ROLE authenticated;
  SELECT public.has_last_active_workspace_admin('$precheck_user'::uuid);
" >/dev/null 2>&1; then
  echo "authenticated unexpectedly executed the service-role-only last-admin precheck RPC."
  exit 1
fi

function_security="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 -c "
  SELECT prosecdef AND provolatile = 's'
  FROM pg_proc
  WHERE oid = 'public.has_last_active_workspace_admin(uuid)'::regprocedure
")"
if [[ "$function_security" != "t" ]]; then
  echo "Last-admin precheck function is not STABLE SECURITY DEFINER."
  exit 1
fi

echo "PASS: proposed single-statement last-admin precheck migration applied on isolated PostgreSQL 17."
echo "PASS: 1,205-membership last-admin and co-admin results verified on PostgreSQL 17."
echo "PASS: RPC execution is restricted to service_role on PostgreSQL 17."

