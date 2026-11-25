import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to the disposable PostgreSQL 17 clean-install database.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Refusing non-local DATABASE_URL.");
assert.ok(!/supabase\.co|jhuyhlzzydcgghrzeexn/i.test(databaseUrl), "Remote Supabase URLs are refused.");

const planGuard = await readFile(
  "supabase/rebuild/proposed-forward-migrations/20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements.sql",
  "utf8",
);
const portalGuard = await readFile(
  "supabase/rebuild/proposed-forward-migrations/20261125134000_require_server_portal_plan_for_resident_access.sql",
  "utf8",
);

const workspaceId = randomUUID();
const condominiumId = randomUUID();
const adminId = randomUUID();
const residentId = randomUUID();
const memberOneId = randomUUID();
const memberTwoId = randomUUID();
const memberThreeId = randomUUID();
const memberFourId = randomUUID();
const portalAccessId = randomUUID();
const requestId = randomUUID();
const adminEmail = "portal-admin-" + adminId + "@example.invalid";
const residentEmail = "portal-resident-" + residentId + "@example.invalid";

function psql(sql) {
  return execFileSync(
    "psql",
    ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
}

const fixture = [
  "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email text;",
  "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;",
  "INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ('" + adminId + "','" + adminEmail + "',now()), ('" + residentId + "','" + residentEmail + "',now());",
  "INSERT INTO public.profiles(id,full_name,email,role,active) VALUES ('" + adminId + "','Portal Regression Admin','" + adminEmail + "','admin',true), ('" + residentId + "','Portal Regression Resident','" + residentEmail + "','resident',true);",
  "INSERT INTO public.workspaces(id,name,plan) VALUES ('" + workspaceId + "','Portal entitlement PostgreSQL regression','free');",
  "INSERT INTO public.condominiums(id,workspace_id,name) VALUES ('" + condominiumId + "','" + workspaceId + "','Portal entitlement PostgreSQL condominium');",
  "INSERT INTO public.workspace_members(workspace_id,user_id,role,active,permissions) VALUES ('" + workspaceId + "','" + adminId + "','admin',true,'{}'::jsonb);",
  "INSERT INTO public.condominium_members(id,condominium_id,user_id,name,email,role,active,legacy_id,data) VALUES " +
    "('" + memberOneId + "','" + condominiumId + "','" + residentId + "','Portal Regression Resident','" + residentEmail + "','resident',true,91001,'{\"apartment\":\"A1\"}'::jsonb)," +
    "('" + memberTwoId + "','" + condominiumId + "',NULL,'Portal Regression Resident Two','resident-two-" + memberTwoId + "@example.invalid','resident',true,91002,'{\"apartment\":\"A2\"}'::jsonb)," +
    "('" + memberThreeId + "','" + condominiumId + "',NULL,'Portal Regression Resident Three','resident-three-" + memberThreeId + "@example.invalid','resident',true,91003,'{\"apartment\":\"A3\"}'::jsonb)," +
    "('" + memberFourId + "','" + condominiumId + "',NULL,'Portal Regression Resident Four','resident-four-" + memberFourId + "@example.invalid','resident',true,91004,'{\"apartment\":\"A4\"}'::jsonb);",
  "INSERT INTO public.portal_access(id,workspace_id,condominium_id,member_id,legacy_id,name,email,role,permissions,active,user_id,data) VALUES ('" + portalAccessId + "','" + workspaceId + "','" + condominiumId + "','" + memberOneId + "',91001,'Portal Regression Resident','" + residentEmail + "','resident','[\"documenti\"]'::jsonb,true,'" + residentId + "','{}'::jsonb);",
  "UPDATE public.portal_access SET permissions='[\"documenti\"]'::jsonb WHERE id='" + portalAccessId + "';",
  "INSERT INTO public.portal_registration_requests(id,workspace_id,requested_user_id,email,full_name,condominium_name,status) VALUES ('" + requestId + "','" + workspaceId + "','" + residentId + "','" + residentEmail + "','Portal Regression Resident','Portal entitlement PostgreSQL condominium','pending');",
].join("\n");

const sql = [
  "BEGIN;",
  fixture,
  "SELECT set_config('request.jwt.claim.sub','" + residentId + "',true);",
  "DO $baseline$ DECLARE v_allowed boolean; BEGIN SELECT private.can_access_resident_condominium_module('" + condominiumId + "'::uuid,'documenti') INTO v_allowed; IF NOT v_allowed THEN RAISE EXCEPTION 'PORTAL_BASELINE_ACCESS_NOT_REPRODUCED'; END IF; END $baseline$;",
  "SET LOCAL ROLE authenticated;",
  "DO $baseline$ DECLARE v_count integer; BEGIN SELECT count(*) INTO v_count FROM public.portal_access WHERE id='" + portalAccessId + "'::uuid; IF v_count<>1 THEN RAISE EXCEPTION 'PORTAL_BASELINE_RLS_READ_NOT_REPRODUCED'; END IF; END $baseline$;",
  "RESET ROLE;",
  "SELECT private.upsert_portal_access_for_member('" + workspaceId + "'::uuid,'" + memberTwoId + "'::uuid,'resident-two-" + memberTwoId + "@example.invalid','[]'::jsonb);",
  "DO $baseline$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.portal_access WHERE workspace_id='" + workspaceId + "'::uuid AND member_id='" + memberTwoId + "'::uuid) THEN RAISE EXCEPTION 'PORTAL_BASELINE_UPSERT_NOT_REPRODUCED'; END IF; END $baseline$;",
  planGuard,
  portalGuard,
  "DO $verify$ DECLARE v_admin text; v_complete text; BEGIN SELECT pg_get_functiondef('private.admin_approve_portal_registration(uuid,uuid)'::regprocedure) INTO v_admin; SELECT pg_get_functiondef('private.complete_portal_registration(text,text,text)'::regprocedure) INTO v_complete; IF position('private.upsert_portal_access_for_member' IN v_admin)=0 OR position('private.upsert_portal_access_for_member' IN v_complete)=0 THEN RAISE EXCEPTION 'PORTAL_REGISTRATION_CALLERS_NOT_GUARDED_BY_SHARED_HELPER'; END IF; END $verify$;",
  "SELECT set_config('request.jwt.claim.sub','" + residentId + "',true);",
  "DO $blocked$ DECLARE v_allowed boolean; v_count integer; BEGIN SELECT private.can_access_resident_condominium_module('" + condominiumId + "'::uuid,'documenti') INTO v_allowed; IF v_allowed THEN RAISE EXCEPTION 'FREE_PLAN_RESIDENT_MODULE_ACCESS_NOT_BLOCKED'; END IF; SELECT count(*) INTO v_count FROM public.portal_access WHERE id='" + portalAccessId + "'::uuid; IF v_count<>1 THEN RAISE EXCEPTION 'FREE_PLAN_SERVER_SIDE_ROW_SHOULD_REMAIN_PRESERVED'; END IF; END $blocked$;",
  "SET LOCAL ROLE authenticated;",
  "DO $blocked$ DECLARE v_count integer; BEGIN SELECT count(*) INTO v_count FROM public.portal_access WHERE id='" + portalAccessId + "'::uuid; IF v_count<>0 THEN RAISE EXCEPTION 'FREE_PLAN_RLS_READ_NOT_BLOCKED'; END IF; END $blocked$;",
  "RESET ROLE;",
  "DO $blocked$ DECLARE v_rejected boolean:=false; BEGIN BEGIN PERFORM private.upsert_portal_access_for_member('" + workspaceId + "'::uuid,'" + memberThreeId + "'::uuid,'resident-three-" + memberThreeId + "@example.invalid','[]'::jsonb); EXCEPTION WHEN OTHERS THEN IF SQLERRM='PORTAL_PLAN_REQUIRED' THEN v_rejected:=true; ELSE RAISE; END IF; END; IF NOT v_rejected THEN RAISE EXCEPTION 'FREE_PLAN_PORTAL_UPSERT_NOT_BLOCKED'; END IF; IF EXISTS (SELECT 1 FROM public.portal_access WHERE member_id='" + memberThreeId + "'::uuid) THEN RAISE EXCEPTION 'FREE_PLAN_PORTAL_ROW_WAS_CREATED'; END IF; END $blocked$;",
  "SELECT set_config('request.jwt.claim.sub','" + adminId + "',true);",
  "SET LOCAL ROLE authenticated;",
  "DO $blocked$ DECLARE v_count integer; v_denied boolean:=false; BEGIN SELECT count(*) INTO v_count FROM public.portal_registration_requests WHERE id='" + requestId + "'::uuid; IF v_count<>0 THEN RAISE EXCEPTION 'FREE_PLAN_ADMIN_CAN_READ_PORTAL_REQUESTS'; END IF; BEGIN INSERT INTO public.portal_access(workspace_id,condominium_id,member_id,legacy_id,name,email,role,permissions,active,data) VALUES ('" + workspaceId + "'::uuid,'" + condominiumId + "'::uuid,'" + memberFourId + "'::uuid,91004,'Portal Regression Resident Four','resident-four-" + memberFourId + "@example.invalid','resident','[]'::jsonb,true,'{}'::jsonb); EXCEPTION WHEN insufficient_privilege THEN v_denied:=true; END; IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_ADMIN_INSERT_NOT_BLOCKED'; END IF; END $blocked$;",
  "RESET ROLE;",
  "UPDATE public.workspaces SET plan='portal' WHERE id='" + workspaceId + "'::uuid;",
  "SELECT set_config('request.jwt.claim.sub','" + residentId + "',true);",
  "DO $allowed$ DECLARE v_allowed boolean; BEGIN SELECT private.can_access_resident_condominium_module('" + condominiumId + "'::uuid,'documenti') INTO v_allowed; IF NOT v_allowed THEN RAISE EXCEPTION 'PORTAL_PLAN_RESIDENT_MODULE_ACCESS_NOT_RESTORED'; END IF; END $allowed$;",
  "SET LOCAL ROLE authenticated;",
  "DO $allowed$ DECLARE v_count integer; BEGIN SELECT count(*) INTO v_count FROM public.portal_access WHERE id='" + portalAccessId + "'::uuid; IF v_count<>1 THEN RAISE EXCEPTION 'PORTAL_PLAN_RESIDENT_RLS_READ_NOT_RESTORED'; END IF; END $allowed$;",
  "RESET ROLE;",
  "SELECT set_config('request.jwt.claim.sub','" + adminId + "',true);",
  "SET LOCAL ROLE authenticated;",
  "DO $allowed$ DECLARE v_count integer; BEGIN SELECT count(*) INTO v_count FROM public.portal_registration_requests WHERE id='" + requestId + "'::uuid; IF v_count<>1 THEN RAISE EXCEPTION 'PORTAL_PLAN_ADMIN_REQUEST_READ_NOT_RESTORED'; END IF; END $allowed$;",
  "INSERT INTO public.portal_access(workspace_id,condominium_id,member_id,legacy_id,name,email,role,permissions,active,data) VALUES ('" + workspaceId + "'::uuid,'" + condominiumId + "'::uuid,'" + memberFourId + "'::uuid,91004,'Portal Regression Resident Four','resident-four-" + memberFourId + "@example.invalid','resident','[]'::jsonb,true,'{}'::jsonb);",
  "RESET ROLE;",
  "SELECT private.upsert_portal_access_for_member('" + workspaceId + "'::uuid,'" + memberThreeId + "'::uuid,'resident-three-" + memberThreeId + "@example.invalid','[]'::jsonb);",
  "UPDATE public.workspaces SET plan='free' WHERE id='" + workspaceId + "'::uuid;",
  "SELECT set_config('request.jwt.claim.sub','" + residentId + "',true);",
  "SET LOCAL ROLE authenticated;",
  "DO $downgrade$ DECLARE v_count integer; BEGIN SELECT count(*) INTO v_count FROM public.portal_access WHERE id='" + portalAccessId + "'::uuid; IF v_count<>0 THEN RAISE EXCEPTION 'PORTAL_DOWNGRADE_DID_NOT_REVOKE_RESIDENT_VISIBILITY'; END IF; END $downgrade$;",
  "RESET ROLE;",
  "ROLLBACK;",
  "SELECT 'PORTAL_PLAN_ENTITLEMENT_POSTGRES_PASS';",
].join("\n");

const output = psql(sql);
assert.match(output, /PORTAL_PLAN_ENTITLEMENT_POSTGRES_PASS/);
console.log("PASS PostgreSQL 17 Portal entitlement regression: baseline bypass reproduced; Free blocks creation, management and resident reads; Portal restores access; downgrade hides existing access.");
