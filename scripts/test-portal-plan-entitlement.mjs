import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

function extractFunction(source, signature) {
  const start = source.indexOf("CREATE OR REPLACE FUNCTION " + signature + "(");
  assert.notEqual(start, -1, "Missing baseline function: " + signature);
  const opening = source.indexOf("AS $function$", start);
  assert.notEqual(opening, -1, "Missing function body: " + signature);
  const closing = source.indexOf("$function$", opening + "$function$".length);
  assert.notEqual(closing, -1, "Missing function terminator: " + signature);
  const end = source.indexOf(";", closing);
  assert.notEqual(end, -1, "Missing function statement terminator: " + signature);
  return source.slice(start, end + 1);
}

const functionsSql = await readFile("supabase/migrations/20261017000003_bethag_baseline_functions.sql", "utf8");
const portalSql = await readFile("supabase/migrations/20261105050000_reconcile_portal_registration_upsert.sql", "utf8");
const planGuardSql = await readFile("supabase/rebuild/proposed-forward-migrations/20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements.sql", "utf8");
const portalGuardSql = await readFile("supabase/rebuild/proposed-forward-migrations/20261125134000_require_server_portal_plan_for_resident_access.sql", "utf8");

const canManageSql = extractFunction(functionsSql, "private.can_manage_workspace_module");
const canAccessBaselineSql = extractFunction(functionsSql, "private.can_access_resident_condominium_module");
const upsertBaselineSql = extractFunction(portalSql, "private.upsert_portal_access_for_member");

const db = new PGlite();
try {
  await db.exec(
    "CREATE SCHEMA IF NOT EXISTS auth;\n" +
    "CREATE SCHEMA IF NOT EXISTS private;\n" +
    "CREATE ROLE anon;\n" +
    "CREATE ROLE authenticated;\n" +
    "CREATE ROLE service_role;\n" +
    "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;\n" +
    "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('email', coalesce(current_setting('request.jwt.claim.email', true), '')) $$;\n" +
    "CREATE TABLE public.workspaces (id uuid PRIMARY KEY, name text NOT NULL, plan text NOT NULL DEFAULT 'free');\n" +
    "CREATE TABLE public.condominiums (id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES public.workspaces(id), name text NOT NULL, archived_at timestamptz);\n" +
    "CREATE TABLE public.workspace_members (workspace_id uuid NOT NULL REFERENCES public.workspaces(id), user_id uuid NOT NULL, role text NOT NULL, active boolean NOT NULL DEFAULT true, permissions jsonb NOT NULL DEFAULT '{}'::jsonb);\n" +
    "CREATE TABLE public.condominium_members (id uuid PRIMARY KEY, condominium_id uuid NOT NULL REFERENCES public.condominiums(id), user_id uuid, name text NOT NULL, email text NOT NULL, role text NOT NULL DEFAULT 'resident', active boolean NOT NULL DEFAULT true, legacy_id bigint, data jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());\n" +
    "CREATE TABLE public.portal_access (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.workspaces(id), condominium_id uuid NOT NULL REFERENCES public.condominiums(id), member_id uuid, legacy_id bigint, name text NOT NULL, email text NOT NULL, role text NOT NULL DEFAULT 'resident', apartment text, permissions jsonb NOT NULL DEFAULT '[]'::jsonb, active boolean NOT NULL DEFAULT true, user_id uuid, data jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());\n" +
    "CREATE TABLE public.portal_registration_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid, condominium_name text, status text NOT NULL DEFAULT 'pending');\n" +
    "ALTER TABLE public.portal_access ENABLE ROW LEVEL SECURITY;\n" +
    "ALTER TABLE public.portal_registration_requests ENABLE ROW LEVEL SECURITY;\n" +
    "GRANT SELECT ON public.condominiums TO authenticated;\n" +
    "GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_access TO authenticated;\n" +
    "GRANT SELECT, UPDATE ON public.portal_registration_requests TO authenticated;\n"
  );

  await db.exec(canManageSql);
  await db.exec(canAccessBaselineSql);
  await db.exec(upsertBaselineSql);
  await db.exec(
    "GRANT EXECUTE ON FUNCTION private.can_manage_workspace_module(uuid, text) TO authenticated;\n" +
    "GRANT EXECUTE ON FUNCTION private.can_access_resident_condominium_module(uuid, text) TO authenticated;\n" +
    "CREATE POLICY \"authorized managers manage portal access\" ON public.portal_access FOR ALL TO authenticated USING (private.can_manage_workspace_module(workspace_id, 'portale')) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'portale'));\n" +
    "CREATE POLICY \"residents read own portal access\" ON public.portal_access FOR SELECT TO authenticated USING (active = true AND EXISTS (SELECT 1 FROM public.condominiums c WHERE c.id = portal_access.condominium_id AND c.archived_at IS NULL) AND (user_id = (SELECT auth.uid()) OR (user_id IS NULL AND lower(email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), '')))));\n" +
    "CREATE POLICY \"managers read portal registration requests\" ON public.portal_registration_requests FOR SELECT TO authenticated USING (private.can_manage_workspace_module(workspace_id, 'portale'));\n" +
    "CREATE POLICY \"managers update portal registration requests\" ON public.portal_registration_requests FOR UPDATE TO authenticated USING (private.can_manage_workspace_module(workspace_id, 'portale')) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'portale'));\n"
  );

  const workspaceId = "20000000-0000-0000-0000-000000000001";
  const condominiumId = "30000000-0000-0000-0000-000000000001";
  const adminId = "10000000-0000-0000-0000-000000000001";
  const residentId = "10000000-0000-0000-0000-000000000002";
  const memberOneId = "40000000-0000-0000-0000-000000000001";
  const memberTwoId = "40000000-0000-0000-0000-000000000002";
  const memberThreeId = "40000000-0000-0000-0000-000000000003";
  const memberFourId = "40000000-0000-0000-0000-000000000004";
  const portalAccessId = "50000000-0000-0000-0000-000000000001";
  const requestId = "60000000-0000-0000-0000-000000000001";

  await db.query("INSERT INTO public.workspaces(id, name, plan) VALUES ($1, $2, 'free')", [workspaceId, "Portal plan regression"]);
  await db.query("INSERT INTO public.condominiums(id, workspace_id, name) VALUES ($1, $2, $3)", [condominiumId, workspaceId, "Portal plan regression condominium"]);
  await db.query("INSERT INTO public.workspace_members(workspace_id, user_id, role, active, permissions) VALUES ($1, $2, 'admin', true, '{}'::jsonb)", [workspaceId, adminId]);
  await db.query("INSERT INTO public.condominium_members(id, condominium_id, user_id, name, email, role, active, legacy_id, data) VALUES ($1, $2, $3, 'Resident One', 'resident-one@example.test', 'resident', true, 1001, '{\"apartment\":\"A1\"}'::jsonb)", [memberOneId, condominiumId, residentId]);
  await db.query("INSERT INTO public.condominium_members(id, condominium_id, user_id, name, email, role, active, legacy_id, data) VALUES ($1, $2, NULL, 'Resident Two', 'resident-two@example.test', 'resident', true, 1002, '{\"apartment\":\"A2\"}'::jsonb)", [memberTwoId, condominiumId]);
  await db.query("INSERT INTO public.condominium_members(id, condominium_id, user_id, name, email, role, active, legacy_id, data) VALUES ($1, $2, NULL, 'Resident Three', 'resident-three@example.test', 'resident', true, 1003, '{\"apartment\":\"A3\"}'::jsonb)", [memberThreeId, condominiumId]);
  await db.query("INSERT INTO public.condominium_members(id, condominium_id, user_id, name, email, role, active, legacy_id, data) VALUES ($1, $2, NULL, 'Resident Four', 'resident-four@example.test', 'resident', true, 1004, '{\"apartment\":\"A4\"}'::jsonb)", [memberFourId, condominiumId]);
  await db.query("INSERT INTO public.portal_access(id, workspace_id, condominium_id, member_id, legacy_id, name, email, role, permissions, active, user_id, data) VALUES ($1, $2, $3, $4, 1001, 'Resident One', 'resident-one@example.test', 'resident', '[\"documenti\"]'::jsonb, true, $5, '{}'::jsonb)", [portalAccessId, workspaceId, condominiumId, memberOneId, residentId]);
  await db.query("INSERT INTO public.portal_registration_requests(id, workspace_id, condominium_name, status) VALUES ($1, $2, $3, 'pending')", [requestId, workspaceId, "Portal plan regression condominium"]);

  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [residentId]);
  await db.query("SELECT set_config('request.jwt.claim.email', $1, false)", ["resident-one@example.test"]);
  let access = await db.query("SELECT private.can_access_resident_condominium_module($1, 'documenti') AS allowed", [condominiumId]);
  assert.equal(access.rows[0].allowed, true, "Baseline must allow resident access without a Portal plan.");

  await db.exec("SET ROLE authenticated");
  let rows = await db.query("SELECT count(*)::int AS count FROM public.portal_access WHERE id = $1", [portalAccessId]);
  assert.equal(rows.rows[0].count, 1, "Baseline RLS must expose the active resident access row.");
  await db.exec("RESET ROLE");

  const baselineUpsert = await db.query("SELECT private.upsert_portal_access_for_member($1, $2, $3, '[]'::jsonb) AS id", [workspaceId, memberTwoId, "resident-two@example.test"]);
  assert.ok(baselineUpsert.rows[0].id, "Baseline helper must create Portal access for a Free workspace.");
  console.log("PASS baseline reproduction: Free workspace can create and expose active Portal access.");

  await db.exec(planGuardSql);
  await db.exec(portalGuardSql);

  const plan = await db.query("SELECT private.workspace_has_portal_plan($1) AS allowed", [workspaceId]);
  assert.equal(plan.rows[0].allowed, false);
  access = await db.query("SELECT private.can_access_resident_condominium_module($1, 'documenti') AS allowed", [condominiumId]);
  assert.equal(access.rows[0].allowed, false, "Resident module access must require the Portal plan.");

  await db.exec("SET ROLE authenticated");
  rows = await db.query("SELECT count(*)::int AS count FROM public.portal_access WHERE id = $1", [portalAccessId]);
  assert.equal(rows.rows[0].count, 0, "Existing Portal rows must be hidden after a downgrade to Free.");
  await db.exec("RESET ROLE");

  await assert.rejects(
    () => db.query("SELECT private.upsert_portal_access_for_member($1, $2, $3, '[]'::jsonb)", [workspaceId, memberThreeId, "resident-three@example.test"]),
    /PORTAL_PLAN_REQUIRED/,
  );
  const blockedMember = await db.query("SELECT user_id FROM public.condominium_members WHERE id = $1", [memberThreeId]);
  assert.equal(blockedMember.rows[0].user_id, null);

  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [adminId]);
  await db.exec("SET ROLE authenticated");
  rows = await db.query("SELECT count(*)::int AS count FROM public.portal_registration_requests WHERE id = $1", [requestId]);
  assert.equal(rows.rows[0].count, 1, "Managers retain visibility of pending requests for cleanup after downgrade.");
  rows = await db.query("SELECT count(*)::int AS count FROM public.portal_access WHERE workspace_id = $1", [workspaceId]);
  assert.equal(rows.rows[0].count, 2, "Managers retain visibility of existing access rows after downgrade.");

  await db.query("UPDATE public.portal_access SET active = false WHERE member_id = $1", [memberTwoId]);
  await db.query("DELETE FROM public.portal_access WHERE member_id = $1", [memberTwoId]);

  const deniedRequestUpdate = await db.query("UPDATE public.portal_registration_requests SET status = 'approved' WHERE id = $1 RETURNING status", [requestId]);
  assert.equal(deniedRequestUpdate.rows.length, 0, "Free workspace managers must not update Portal requests.");
  const unchangedRequest = await db.query("SELECT status FROM public.portal_registration_requests WHERE id = $1", [requestId]);
  assert.equal(unchangedRequest.rows[0].status, "pending");

  let insertDenied = false;
  try {
    await db.query("INSERT INTO public.portal_access(workspace_id, condominium_id, member_id, legacy_id, name, email, role, permissions, active, user_id, data) VALUES ($1, $2, $3, 1004, 'Resident Four', 'resident-four@example.test', 'resident', '[]'::jsonb, true, NULL, '{}'::jsonb)", [workspaceId, condominiumId, memberFourId]);
  } catch (error) {
    insertDenied = /row-level security|permission denied/i.test(error.message);
  }
  assert.equal(insertDenied, true, "Free workspace administrators must not create Portal access rows.");
  await db.exec("RESET ROLE");

  await db.query("UPDATE public.workspaces SET plan = 'portal' WHERE id = $1", [workspaceId]);
  const portalPlan = await db.query("SELECT private.workspace_has_portal_plan($1) AS allowed", [workspaceId]);
  assert.equal(portalPlan.rows[0].allowed, true);
  access = await db.query("SELECT private.can_access_resident_condominium_module($1, 'documenti') AS allowed", [condominiumId]);
  assert.equal(access.rows[0].allowed, true);

  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [residentId]);
  await db.exec("SET ROLE authenticated");
  rows = await db.query("SELECT count(*)::int AS count FROM public.portal_access WHERE id = $1", [portalAccessId]);
  assert.equal(rows.rows[0].count, 1, "Portal plan must restore resident access to existing Portal rows.");
  await db.exec("RESET ROLE");

  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [adminId]);
  await db.exec("SET ROLE authenticated");
  rows = await db.query("SELECT count(*)::int AS count FROM public.portal_registration_requests WHERE id = $1", [requestId]);
  assert.equal(rows.rows[0].count, 1, "Portal plan administrators must see registration requests.");
  await db.query("INSERT INTO public.portal_registration_requests(id, workspace_id, condominium_name, status) VALUES ($1, $2, $3, 'pending')", ["60000000-0000-0000-0000-000000000003", workspaceId, "Portal plan regression condominium"]);
  await db.query("INSERT INTO public.portal_access(workspace_id, condominium_id, member_id, legacy_id, name, email, role, permissions, active, user_id, data) VALUES ($1, $2, $3, 1004, 'Resident Four', 'resident-four@example.test', 'resident', '[]'::jsonb, true, NULL, '{}'::jsonb)", [workspaceId, condominiumId, memberFourId]);
  await db.exec("RESET ROLE");

  const allowedUpsert = await db.query("SELECT private.upsert_portal_access_for_member($1, $2, $3, '[]'::jsonb) AS id", [workspaceId, memberThreeId, "resident-three@example.test"]);
  assert.ok(allowedUpsert.rows[0].id, "Portal plan must allow registration helper to create access.");

  await db.query("UPDATE public.workspaces SET plan = 'free' WHERE id = $1", [workspaceId]);
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [residentId]);
  await db.exec("SET ROLE authenticated");
  rows = await db.query("SELECT count(*)::int AS count FROM public.portal_access WHERE id = $1", [portalAccessId]);
  assert.equal(rows.rows[0].count, 0, "A later downgrade must revoke resident visibility without deleting rows.");
  await db.exec("RESET ROLE");
  await assert.rejects(
    () => db.query("INSERT INTO public.portal_registration_requests(id, workspace_id, condominium_name, status) VALUES ($1, $2, $3, 'pending')", ["60000000-0000-0000-0000-000000000004", workspaceId, "Portal plan regression condominium"]),
    /PORTAL_PLAN_REQUIRED/,
  );

  console.log("PASS Portal entitlement runtime regression: baseline bypass reproduced; Free plan blocks registration, management and resident reads; Portal plan restores them; downgrade revokes visibility.");
} finally {
  await db.close();
}
