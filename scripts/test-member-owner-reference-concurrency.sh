#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${OWNER_SYNC_TEST_WORKSPACE_ID:?}"
: "${OWNER_SYNC_TEST_CONDOMINIUM_ID:?}"
: "${OWNER_SYNC_TEST_UNIT_ID:?}"
: "${OWNER_SYNC_TEST_MEMBER_A_ID:?}"
: "${OWNER_SYNC_TEST_MEMBER_B_ID:?}"
: "${OWNER_SYNC_TEST_UNIT_B_ID:?}"
: "${OWNER_SYNC_TEST_USER_ID:?}"
: "${OWNER_SYNC_TEST_LEGACY_A:?}"
: "${OWNER_SYNC_TEST_LEGACY_B:?}"

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
migration="$repo_root/supabase/rebuild/proposed-forward-migrations/20261127060000_atomic_condominium_member_owner_reference_sync.sql"
tmp_dir="$(mktemp -d)"
cleanup() {
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL || true
DELETE FROM public.condominium_members
WHERE id IN ('$OWNER_SYNC_TEST_MEMBER_A_ID'::uuid, '$OWNER_SYNC_TEST_MEMBER_B_ID'::uuid);
DELETE FROM public.condominium_units
WHERE id IN ('$OWNER_SYNC_TEST_UNIT_ID'::uuid, '$OWNER_SYNC_TEST_UNIT_B_ID'::uuid);
DELETE FROM public.workspace_members
WHERE workspace_id='$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid AND user_id='$OWNER_SYNC_TEST_USER_ID'::uuid;
DELETE FROM public.profiles WHERE id='$OWNER_SYNC_TEST_USER_ID'::uuid;
DELETE FROM public.condominiums WHERE id='$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid;
DELETE FROM public.workspaces WHERE id='$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid;
DELETE FROM auth.users WHERE id='$OWNER_SYNC_TEST_USER_ID'::uuid;
SQL
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$migration"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users(id) VALUES ('$OWNER_SYNC_TEST_USER_ID'::uuid) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspaces(id, name, plan)
VALUES ('$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid, 'owner sync concurrency fixture', 'free');

INSERT INTO public.profiles(id,full_name,email,role,active)
VALUES ('$OWNER_SYNC_TEST_USER_ID'::uuid, 'Owner Sync CI Collaborator', 'owner-sync-ci@example.invalid', 'collaborator', true);

INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions)
VALUES ('$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid, '$OWNER_SYNC_TEST_USER_ID'::uuid, 'collaborator', true, '{"condomini":true}'::jsonb);

INSERT INTO public.condominiums(id, workspace_id, name)
VALUES ('$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid, '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid, 'owner sync concurrency fixture');

INSERT INTO public.condominium_units(id, workspace_id, condominium_id, unit_code, data)
VALUES
  ('$OWNER_SYNC_TEST_UNIT_ID'::uuid, '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid, '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid, 'SYNC-1', '{"ownerMemberIds":[]}'::jsonb),
  ('$OWNER_SYNC_TEST_UNIT_B_ID'::uuid, '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid, '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid, 'SYNC-2', '{"ownerMemberIds":[]}'::jsonb);

INSERT INTO public.condominium_members(id, condominium_id, unit_id, legacy_id, name, role, active, data)
VALUES
  ('$OWNER_SYNC_TEST_MEMBER_A_ID'::uuid, '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid, '$OWNER_SYNC_TEST_UNIT_ID'::uuid, $OWNER_SYNC_TEST_LEGACY_A::bigint, 'Owner Sync A', 'resident', true, '{"role":"Proprietario","currentOwner":true,"positionStatus":"Attivo"}'::jsonb),
  ('$OWNER_SYNC_TEST_MEMBER_B_ID'::uuid, '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid, '$OWNER_SYNC_TEST_UNIT_ID'::uuid, $OWNER_SYNC_TEST_LEGACY_B::bigint, 'Owner Sync B', 'resident', true, '{"role":"Proprietario","currentOwner":true,"positionStatus":"Attivo"}'::jsonb);
SQL

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
      echo "Process exited before expected unit-row lock wait: $app_name"
      return 1
    fi
    sleep 0.05
  done
  cat "$log_file"
  echo "Timed out waiting for unit-row lock: $app_name"
  return 1
}

# Reproduce the old client read/modify/write: both sessions read the same
# empty array before either writes its independently computed replacement.
legacy_a_log="$tmp_dir/legacy-a.log"
legacy_b_log="$tmp_dir/legacy-b.log"
PGAPPNAME=owner_sync_legacy_a psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$legacy_a_log" 2>&1 <<SQL &
BEGIN;
SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid;
\echo LEGACY_A_READ
SELECT pg_sleep(1);
UPDATE public.condominium_units
SET data=pg_catalog.jsonb_set(data, '{ownerMemberIds}', pg_catalog.jsonb_build_array($OWNER_SYNC_TEST_LEGACY_A::bigint), true),
    updated_at=pg_catalog.now()
WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid;
COMMIT;
SQL
legacy_a_pid=$!
wait_for_marker "$legacy_a_log" "LEGACY_A_READ" "$legacy_a_pid"

PGAPPNAME=owner_sync_legacy_b psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$legacy_b_log" 2>&1 <<SQL &
BEGIN;
SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid;
\echo LEGACY_B_READ
SELECT pg_sleep(2);
UPDATE public.condominium_units
SET data=pg_catalog.jsonb_set(data, '{ownerMemberIds}', pg_catalog.jsonb_build_array($OWNER_SYNC_TEST_LEGACY_B::bigint), true),
    updated_at=pg_catalog.now()
WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid;
COMMIT;
SQL
legacy_b_pid=$!
wait_for_marker "$legacy_b_log" "LEGACY_B_READ" "$legacy_b_pid"
wait "$legacy_a_pid"
wait "$legacy_b_pid"

legacy_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid")"
if [[ "$legacy_result" != "[$OWNER_SYNC_TEST_LEGACY_B]" ]]; then
  echo "Legacy lost-update reproduction did not match expected last-writer-wins result: $legacy_result"
  exit 1
fi
echo "LEGACY DEFECT REPRODUCED: two concurrent member saves read the same owner list; the second write overwrote the first owner."

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -c "UPDATE public.condominium_units SET data=pg_catalog.jsonb_set(data,'{ownerMemberIds}','[]'::jsonb,true) WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid"

# Hold the unit row so both RPC sessions are observed waiting at the same
# lock boundary before either can compute the merged owner array.
lock_log="$tmp_dir/unit-lock.log"
PGAPPNAME=owner_sync_lock_holder psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$lock_log" 2>&1 <<SQL &
BEGIN;
SELECT id FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid FOR UPDATE;
\echo UNIT_LOCK_HELD
SELECT pg_sleep(5);
COMMIT;
SQL
lock_pid=$!
wait_for_marker "$lock_log" "UNIT_LOCK_HELD" "$lock_pid"

call_a_log="$tmp_dir/call-a.log"
call_b_log="$tmp_dir/call-b.log"
PGAPPNAME=owner_sync_call_a psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$call_a_log" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
SELECT public.sync_condominium_member_owner_references(
  '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid,
  '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid,
  NULL,
  '$OWNER_SYNC_TEST_UNIT_ID'::uuid,
  $OWNER_SYNC_TEST_LEGACY_A::bigint,
  true
);
COMMIT;
SQL
call_a_pid=$!

PGAPPNAME=owner_sync_call_b psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$call_b_log" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
SELECT public.sync_condominium_member_owner_references(
  '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid,
  '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid,
  NULL,
  '$OWNER_SYNC_TEST_UNIT_ID'::uuid,
  $OWNER_SYNC_TEST_LEGACY_B::bigint,
  true
);
COMMIT;
SQL
call_b_pid=$!

wait_for_lock_waiter "owner_sync_call_a" "$call_a_log" "$call_a_pid"
wait_for_lock_waiter "owner_sync_call_b" "$call_b_log" "$call_b_pid"
wait "$lock_pid"
wait "$call_a_pid" || { cat "$call_a_log"; exit 1; }
wait "$call_b_pid" || { cat "$call_b_log"; exit 1; }

both_present="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT (data->'ownerMemberIds') @> pg_catalog.jsonb_build_array($OWNER_SYNC_TEST_LEGACY_A::bigint) AND (data->'ownerMemberIds') @> pg_catalog.jsonb_build_array($OWNER_SYNC_TEST_LEGACY_B::bigint) FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid")"
if [[ "$both_present" != "t" ]]; then
  echo "Atomic owner sync lost a concurrent owner reference: $both_present"
  exit 1
fi
echo "PASS: both concurrent owners retained under the ordered unit-row lock."

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
SELECT public.sync_condominium_member_owner_references(
  '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid,
  '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid,
  '$OWNER_SYNC_TEST_UNIT_ID'::uuid,
  NULL,
  $OWNER_SYNC_TEST_LEGACY_A::bigint,
  false
);
COMMIT;
SQL

remaining="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid")"
if [[ "$remaining" != "[$OWNER_SYNC_TEST_LEGACY_B]" ]]; then
  echo "Unexpected owner list after removal: $remaining"
  exit 1
fi
echo "PASS: moving/removing one member preserves the other current owner."


# Reproduce the legacy delete-vs-save race. The delete session reads [A],
# while the atomic owner save adds B. The old client then writes its stale []
# snapshot and incorrectly removes B.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -c "UPDATE public.condominium_units SET data=pg_catalog.jsonb_set(data,'{ownerMemberIds}',pg_catalog.jsonb_build_array($OWNER_SYNC_TEST_LEGACY_A::bigint),true) WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid"

legacy_delete_log="$tmp_dir/legacy-delete.log"
PGAPPNAME=owner_sync_legacy_delete psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$legacy_delete_log" 2>&1 <<SQL &
BEGIN;
SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid;
\echo LEGACY_DELETE_READ
SELECT pg_sleep(2);
UPDATE public.condominium_units
SET data=pg_catalog.jsonb_set(data, '{ownerMemberIds}', '[]'::jsonb, true),
    updated_at=pg_catalog.now()
WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid;
COMMIT;
SQL
legacy_delete_pid=$!
wait_for_marker "$legacy_delete_log" "LEGACY_DELETE_READ" "$legacy_delete_pid"

legacy_add_log="$tmp_dir/legacy-add.log"
PGAPPNAME=owner_sync_legacy_add psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$legacy_add_log" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
SELECT public.sync_condominium_member_owner_references(
  '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid,
  '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid,
  NULL,
  '$OWNER_SYNC_TEST_UNIT_ID'::uuid,
  $OWNER_SYNC_TEST_LEGACY_B::bigint,
  true
);
COMMIT;
SQL
legacy_add_pid=$!
wait "$legacy_add_pid" || { cat "$legacy_add_log"; exit 1; }
wait "$legacy_delete_pid" || { cat "$legacy_delete_log"; exit 1; }

legacy_delete_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid")"
if [[ "$legacy_delete_result" != "[]" ]]; then
  echo "Legacy delete lost-update reproduction did not match expected stale result: $legacy_delete_result"
  exit 1
fi
echo "LEGACY DELETE RACE REPRODUCED: stale member deletion cleanup overwrote a concurrent co-owner save."

# Re-run the same interleaving through the production member DELETE trigger
# and the row-locked owner-sync RPC. Both wait on the same unit row, then
# serialize without losing the surviving owner.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -c "UPDATE public.condominium_units SET data=pg_catalog.jsonb_set(data,'{ownerMemberIds}',pg_catalog.jsonb_build_array($OWNER_SYNC_TEST_LEGACY_A::bigint),true) WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid"

delete_lock_log="$tmp_dir/delete-unit-lock.log"
PGAPPNAME=owner_sync_delete_lock_holder psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$delete_lock_log" 2>&1 <<SQL &
BEGIN;
SELECT id FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid FOR UPDATE;
\echo DELETE_UNIT_LOCK_HELD
SELECT pg_sleep(5);
COMMIT;
SQL
delete_lock_pid=$!
wait_for_marker "$delete_lock_log" "DELETE_UNIT_LOCK_HELD" "$delete_lock_pid"

trigger_delete_log="$tmp_dir/trigger-delete.log"
PGAPPNAME=owner_sync_trigger_delete psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$trigger_delete_log" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
DELETE FROM public.condominium_members
WHERE id='$OWNER_SYNC_TEST_MEMBER_A_ID'::uuid
  AND condominium_id='$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid;
COMMIT;
SQL
trigger_delete_pid=$!

trigger_add_log="$tmp_dir/trigger-add.log"
PGAPPNAME=owner_sync_trigger_add psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 >"$trigger_add_log" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
SELECT public.sync_condominium_member_owner_references(
  '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid,
  '$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid,
  NULL,
  '$OWNER_SYNC_TEST_UNIT_ID'::uuid,
  $OWNER_SYNC_TEST_LEGACY_B::bigint,
  true
);
COMMIT;
SQL
trigger_add_pid=$!

wait_for_lock_waiter "owner_sync_trigger_delete" "$trigger_delete_log" "$trigger_delete_pid"
wait_for_lock_waiter "owner_sync_trigger_add" "$trigger_add_log" "$trigger_add_pid"
wait "$delete_lock_pid"
wait "$trigger_delete_pid" || { cat "$trigger_delete_log"; exit 1; }
wait "$trigger_add_pid" || { cat "$trigger_add_log"; exit 1; }

trigger_delete_result="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT data->'ownerMemberIds' FROM public.condominium_units WHERE id='$OWNER_SYNC_TEST_UNIT_ID'::uuid")"
deleted_member_count="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM public.condominium_members WHERE id='$OWNER_SYNC_TEST_MEMBER_A_ID'::uuid")"
if [[ "$trigger_delete_result" != "[$OWNER_SYNC_TEST_LEGACY_B]" || "$deleted_member_count" != "0" ]]; then
  echo "Trigger-based concurrent delete/save did not preserve the surviving owner: owners=$trigger_delete_result deleted_member_count=$deleted_member_count"
  cat "$trigger_delete_log"
  cat "$trigger_add_log"
  exit 1
fi
echo "PASS: trigger-based member deletion and concurrent owner save preserve the surviving owner."

# Force owner synchronization to fail after INSERT; the RPC must roll back the row.
rollback_legacy="$((OWNER_SYNC_TEST_LEGACY_A + 1000000))"
if psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '$OWNER_SYNC_TEST_USER_ID';
SELECT * FROM public.save_condominium_member_with_owner_sync(
 '$OWNER_SYNC_TEST_WORKSPACE_ID'::uuid,'$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid,
 NULL,$rollback_legacy::bigint,NULL,'Atomic rollback probe',NULL,'resident',true,
 '{}'::jsonb,'{"role":"Proprietario","currentOwner":true,"positionStatus":"Attivo"}'::jsonb
);
COMMIT;
SQL
then
 echo "Atomic save unexpectedly succeeded without a target unit."; exit 1
fi
rollback_count="$(psql "$DATABASE_URL" -X -A -t -q -v ON_ERROR_STOP=1 \
 -c "SELECT count(*) FROM public.condominium_members WHERE condominium_id='$OWNER_SYNC_TEST_CONDOMINIUM_ID'::uuid AND legacy_id=$rollback_legacy::bigint")"
if [[ "$rollback_count" != "0" ]]; then echo "Atomic rollback failed: count=$rollback_count"; exit 1; fi
echo "PASS: ATOMIC SAVE ROLLBACK VERIFIED."
