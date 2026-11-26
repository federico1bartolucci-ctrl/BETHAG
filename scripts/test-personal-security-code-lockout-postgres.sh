#!/usr/bin/env bash
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
: "${PGPASSWORD:?PGPASSWORD is required}"
export PGPASSWORD

DB_NAME="bethag_personal_code_test_${GITHUB_RUN_ID:-$$}"
USER_ID="10000000-0000-4000-8000-000000000001"
LEGACY_USER_ID="10000000-0000-4000-8000-000000000002"
MIGRATION="supabase/rebuild/proposed-forward-migrations/20261126030000_harden_personal_security_code_lifecycle.sql"

createdb --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" "$DB_NAME"
cleanup() {
  dropdb --if-exists --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" "$DB_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

psql_test() {
  psql --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$DB_NAME" -X -q -A -t -v ON_ERROR_STOP=1 "$@"
}

query() {
  psql_test -c "$1"
}

as_user() {
  local user_id="$1"
  local statement="$2"
  psql_test -c "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '$user_id', false); $statement; RESET ROLE;" | tail -n 1
}

assert_result() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $label (expected '$expected', got '$actual')" >&2
    exit 1
  fi
}

psql_test <<'SQL'
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE SCHEMA extensions;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$roles$;

CREATE EXTENSION pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid
$function$;

CREATE TABLE public.user_security_settings (
  user_id uuid PRIMARY KEY,
  personal_code_hash text,
  personal_code_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);
SQL

psql_test -f "$MIGRATION"

# First-time setup uses actual pgcrypto bcrypt, not a deterministic test stand-in.
as_user "$USER_ID" "SELECT public.set_personal_security_code('original-code', true)" >/dev/null
hash="$(query "SELECT personal_code_hash FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")"
if [[ "$hash" != \$2* ]]; then
  echo "FAIL: stored personal-code hash is not a bcrypt hash" >&2
  exit 1
fi
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "t" "real bcrypt verification"

# The legacy setter cannot replace an enabled code without the current-code RPC.
if as_user "$USER_ID" "SELECT public.set_personal_security_code('attacker-reset', true)" >/dev/null 2>&1; then
  echo "FAIL: legacy setter replaced an enabled personal code" >&2
  exit 1
fi
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "t" "legacy setter remains blocked"

# Five sequential failed attempts lock verification for 15 minutes.
for attempt in 1 2 3 4 5; do
  assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('wrong-code')")" "f" "failed attempt $attempt"
done
state="$(query "SELECT personal_code_failed_attempts::text || ':' || (personal_code_locked_until > pg_catalog.now())::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")"
assert_result "$state" "5:true" "five-attempt lockout"
lock_window="$(query "SELECT (personal_code_locked_until > pg_catalog.now() + interval '14 minutes' AND personal_code_locked_until <= pg_catalog.now() + interval '15 minutes 5 seconds')::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")"
assert_result "$lock_window" "true" "15-minute lockout duration"
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "f" "correct code rejected during lockout"

# A successful verification after expiry clears the lock and counter.
query "UPDATE public.user_security_settings SET personal_code_locked_until = pg_catalog.now() - interval '1 second' WHERE user_id = '$USER_ID'::uuid" >/dev/null
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "t" "verification after lockout expiry"
state="$(query "SELECT personal_code_failed_attempts::text || ':' || (personal_code_locked_until IS NULL)::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")"
assert_result "$state" "0:true" "expired lock reset"

# Five simultaneous failed attempts must serialize on the same settings row.
query "UPDATE public.user_security_settings SET personal_code_failed_attempts = 0, personal_code_locked_until = NULL WHERE user_id = '$USER_ID'::uuid" >/dev/null
pids=()
for attempt in 1 2 3 4 5; do
  ( as_user "$USER_ID" "SELECT public.verify_personal_security_code('parallel-wrong')" >/dev/null ) &
  pids+=("$!")
done
for pid in "${pids[@]}"; do
  wait "$pid"
done
state="$(query "SELECT personal_code_failed_attempts::text || ':' || (personal_code_locked_until > pg_catalog.now())::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")"
assert_result "$state" "5:true" "concurrent failed-attempt serialization"
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "f" "concurrent lockout cannot be bypassed"

# Expire the concurrent lock, then verify atomic code replacement and disable.
query "UPDATE public.user_security_settings SET personal_code_locked_until = pg_catalog.now() - interval '1 second' WHERE user_id = '$USER_ID'::uuid" >/dev/null
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "t" "post-concurrency expiry"
assert_result "$(as_user "$USER_ID" "SELECT public.change_personal_security_code('wrong-code', 'replacement-code', true)")" "f" "wrong current code rejected"
assert_result "$(query "SELECT personal_code_failed_attempts::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")" "1" "failed change persists attempt"
assert_result "$(as_user "$USER_ID" "SELECT public.change_personal_security_code('original-code', 'replacement-code', true)")" "t" "atomic code replacement"
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('original-code')")" "f" "old code rejected after replacement"
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code('replacement-code')")" "t" "replacement bcrypt hash verifies"
assert_result "$(as_user "$USER_ID" "SELECT public.change_personal_security_code('wrong-code', NULL, false)")" "f" "wrong code cannot disable protection"
assert_result "$(as_user "$USER_ID" "SELECT public.change_personal_security_code('replacement-code', NULL, false)")" "t" "atomic protection disable"
state="$(query "SELECT personal_code_enabled::text || ':' || (personal_code_hash IS NULL)::text || ':' || personal_code_failed_attempts::text || ':' || (personal_code_locked_until IS NULL)::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")"
assert_result "$state" "false:true:0:true" "disable clears hash and lockout"

# Exactly 72 UTF-8 bytes are accepted; 76 bytes are rejected before consuming an attempt.
as_user "$USER_ID" "SELECT public.set_personal_security_code(repeat('😀', 18), true)" >/dev/null
assert_result "$(as_user "$USER_ID" "SELECT public.verify_personal_security_code(repeat('😀', 18))")" "t" "72-byte bcrypt code"
if as_user "$USER_ID" "SELECT public.change_personal_security_code(repeat('😀', 18), repeat('😀', 19), true)" >/dev/null 2>&1; then
  echo "FAIL: 76-byte replacement code was accepted" >&2
  exit 1
fi
assert_result "$(query "SELECT personal_code_failed_attempts::text FROM public.user_security_settings WHERE user_id = '$USER_ID'::uuid")" "0" "invalid replacement does not consume an attempt"

# Existing legacy bcrypt hashes above 72 UTF-8 bytes remain verifiable.
psql_test -c "INSERT INTO public.user_security_settings (user_id, personal_code_hash, personal_code_enabled, personal_code_failed_attempts, personal_code_locked_until) VALUES ('$LEGACY_USER_ID'::uuid, extensions.crypt(repeat('😀', 20), extensions.gen_salt('bf')), true, 0, NULL)" >/dev/null
assert_result "$(as_user "$LEGACY_USER_ID" "SELECT public.verify_personal_security_code(repeat('😀', 20))")" "t" "legacy bcrypt truncation compatibility"

acl="$(query "SELECT has_function_privilege('authenticated', 'public.change_personal_security_code(text,text,boolean)', 'EXECUTE')::text || ':' || has_function_privilege('anon', 'public.change_personal_security_code(text,text,boolean)', 'EXECUTE')::text")"
assert_result "$acl" "true:false" "authenticated-only RPC grant"
private_acl="$(query "SELECT has_function_privilege('authenticated', 'private.change_personal_security_code(text,text,boolean)', 'EXECUTE')::text || ':' || has_schema_privilege('authenticated', 'private', 'USAGE')::text")"
assert_result "$private_acl" "true:true" "authenticated private wrapper permissions"

echo "PASS: PostgreSQL 17 pgcrypto bcrypt personal-code verification"
echo "PASS: five sequential and five concurrent failed attempts enforce the 15-minute lockout"
echo "PASS: atomic change/disable, 72-byte boundary and legacy bcrypt compatibility"
echo "PASS: authenticated-only RPC permissions"
