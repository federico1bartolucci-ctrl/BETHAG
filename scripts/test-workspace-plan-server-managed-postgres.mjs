import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to the disposable local clean-install PostgreSQL database.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
  "Refusing non-local DATABASE_URL; this regression must never touch QA or Production.");

function psql(args, input) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    input,
  });
}

const migration = "supabase/rebuild/proposed-forward-migrations/20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements.sql";
psql(["-f", migration]);

const workspaceId = randomUUID();
const userId = randomUUID();
const email = `plan-guard-${userId}@example.test`;
const sql = `
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('${userId}', '${email}');
INSERT INTO public.workspaces (id, name, plan) VALUES ('${workspaceId}', 'Plan guard regression', 'free');
INSERT INTO public.workspace_members (workspace_id, user_id, role, active, permissions)
VALUES ('${workspaceId}', '${userId}', 'admin', true, '{}'::jsonb);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${userId}', true);
DO $test$
BEGIN
  IF NOT private.is_workspace_admin('${workspaceId}'::uuid) THEN
    RAISE EXCEPTION 'TEST_FIXTURE_DID_NOT_SATISFY_WORKSPACE_ADMIN_RLS';
  END IF;
  BEGIN
    UPDATE public.workspaces
       SET plan = 'professional'
     WHERE id = '${workspaceId}'::uuid;
    RAISE EXCEPTION 'WORKSPACE_PLAN_GUARD_DID_NOT_FIRE';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'WORKSPACE_PLAN_SERVER_MANAGED' THEN
      RAISE;
    END IF;
  END;
END
$test$;
RESET ROLE;

DO $verify$
BEGIN
  IF (SELECT plan FROM public.workspaces WHERE id = '${workspaceId}'::uuid) <> 'free' THEN
    RAISE EXCEPTION 'AUTHENTICATED_PLAN_CHANGE_WAS_NOT_ROLLED_BACK';
  END IF;
END
$verify$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub', '${userId}', true);
UPDATE public.workspaces
   SET plan = 'professional'
 WHERE id = '${workspaceId}'::uuid;
RESET ROLE;

DO $service$
BEGIN
  IF (SELECT plan FROM public.workspaces WHERE id = '${workspaceId}'::uuid) <> 'professional' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_PLAN_UPDATE_WAS_NOT_ALLOWED';
  END IF;
END
$service$;

ROLLBACK;
SELECT 'WORKSPACE_PLAN_SERVER_MANAGED_POSTGRES_PASS';
`;

const output = psql(["-c", sql]);
assert.match(output, /WORKSPACE_PLAN_SERVER_MANAGED_POSTGRES_PASS/);
console.log("PASS PostgreSQL 17: authenticated workspace admin is rejected despite passing the workspace-admin RLS predicate.");
console.log("PASS PostgreSQL 17: service_role can update the server-managed plan.");
console.log("PASS PostgreSQL 17: the denied client upgrade leaves the workspace plan unchanged.");
