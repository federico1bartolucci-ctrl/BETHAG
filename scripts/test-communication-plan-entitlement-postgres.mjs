import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to the disposable local PostgreSQL 17 clean-install database.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
  "Refusing non-local DATABASE_URL; this regression must never touch QA or Production.");
assert.ok(!/supabase\.co|jhuyhlzzydcgghrzeexn/i.test(databaseUrl),
  "Remote Supabase URLs are refused.");

function psql(args, input) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    input,
  });
}

const ids = {
  workspace: randomUUID(),
  admin: randomUUID(),
  condominium: randomUUID(),
  member: randomUUID(),
  communication: randomUUID(),
  recipient: randomUUID(),
};
const email = "communication-plan-" + ids.admin + "@example.invalid";
const memberEmail = "resident-" + ids.member + "@example.invalid";

// Supabase grants authenticated access to auth.uid(); the isolated clean-install
// bootstrap creates auth.uid() but does not model the managed auth-schema USAGE grant.
psql(["-c", "GRANT USAGE ON SCHEMA auth TO authenticated;"]);

const fixtureSql = `
INSERT INTO auth.users (id, email) VALUES ('${ids.admin}', '${email}');
INSERT INTO public.profiles (id, full_name, email, role, active)
VALUES ('${ids.admin}', 'Communication Plan Regression Admin', '${email}', 'admin', true);
INSERT INTO public.workspaces (id, name, plan)
VALUES ('${ids.workspace}', 'Communication plan entitlement regression', 'free');
INSERT INTO public.workspace_members (workspace_id, user_id, role, active, permissions)
VALUES ('${ids.workspace}', '${ids.admin}', 'admin', true, '{}'::jsonb);
INSERT INTO public.condominiums (id, workspace_id, name)
VALUES ('${ids.condominium}', '${ids.workspace}', 'Communication plan regression condominium');
INSERT INTO public.condominium_members (
  id, condominium_id, user_id, name, email, role, active, legacy_id, data
)
VALUES (
  '${ids.member}', '${ids.condominium}', NULL, 'Communication Regression Resident',
  '${memberEmail}', 'resident', true, 991001, '{}'::jsonb
);
INSERT INTO public.communications (
  id, workspace_id, condominium_id, title, body, published, legacy_id
)
VALUES (
  '${ids.communication}', '${ids.workspace}', '${ids.condominium}',
  'Plan gate regression', 'Test body', false, 991001
);
`;

const baselineSql = `
BEGIN;
${fixtureSql}
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${ids.admin}', true);
DO $baseline$
DECLARE
  v_result jsonb;
  v_count integer;
BEGIN
  IF NOT private.can_manage_workspace_module('${ids.workspace}'::uuid, 'comunicazioni') THEN
    RAISE EXCEPTION 'BASELINE_ADMIN_PERMISSION_NOT_REPRODUCED';
  END IF;

  UPDATE public.communications
  SET published = true
  WHERE id = '${ids.communication}'::uuid;

  IF NOT EXISTS (
    SELECT 1 FROM public.communications
    WHERE id = '${ids.communication}'::uuid AND published = true
  ) THEN
    RAISE EXCEPTION 'BASELINE_FREE_COMMUNICATION_PUBLISH_NOT_REPRODUCED';
  END IF;

  v_result := public.prepare_communication_recipients('${ids.communication}'::uuid);
  IF coalesce((v_result->>'recipient_count')::integer, 0) <> 1 THEN
    RAISE EXCEPTION 'BASELINE_FREE_RECIPIENT_PREPARATION_NOT_REPRODUCED: %', v_result;
  END IF;

  UPDATE public.communication_recipients
  SET status = 'queued', queued_at = now() - interval '20 minutes'
  WHERE communication_id = '${ids.communication}'::uuid;

  v_result := public.reset_stale_communication_recipients(
    '${ids.communication}'::uuid,
    interval '15 minutes'
  );
  IF coalesce((v_result->>'reset')::integer, 0) <> 1 THEN
    RAISE EXCEPTION 'BASELINE_FREE_STALE_RECIPIENT_RESET_NOT_REPRODUCED: %', v_result;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.communication_recipients
  WHERE communication_id = '${ids.communication}'::uuid
    AND status = 'pending';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'BASELINE_RECIPIENT_NOT_RESET';
  END IF;
END
$baseline$;
RESET ROLE;
ROLLBACK;
SELECT 'COMMUNICATIONS_FREE_PLAN_BASELINE_BYPASS_REPRODUCED';
`;
const baselineOutput = psql(["-c", baselineSql]);
assert.match(baselineOutput, /COMMUNICATIONS_FREE_PLAN_BASELINE_BYPASS_REPRODUCED/);
console.log("PASS baseline reproduction: a Free workspace admin can publish a communication, prepare recipients and reset stale queued delivery rows.");

const planMigration = "supabase/rebuild/proposed-forward-migrations/20261125125000_server_manage_workspace_plan_and_guard_ai_entitlements.sql";
const portalPlanMigration = "supabase/rebuild/proposed-forward-migrations/20261125134000_require_server_portal_plan_for_resident_access.sql";
const communicationMigration = "supabase/rebuild/proposed-forward-migrations/20261125141500_require_plus_plan_for_communications.sql";
const portalPublicationMigration = "supabase/rebuild/proposed-forward-migrations/20261125170000_require_portal_plan_for_communication_publication.sql";
psql(["-f", planMigration]);
psql(["-f", portalPlanMigration]);
psql(["-f", communicationMigration]);
psql(["-f", portalPublicationMigration]);

// Create the persistent fixture as Free, then use only service_role to seed the
// existing communication/recipient and downgrade it before authenticated tests.
const fixtureWithoutCommunication = fixtureSql.replace(
  `INSERT INTO public.communications (
  id, workspace_id, condominium_id, title, body, published, legacy_id
)
VALUES (
  '${ids.communication}', '${ids.workspace}', '${ids.condominium}',
  'Plan gate regression', 'Test body', false, 991001
);
`,
  "",
);
assert.notEqual(fixtureWithoutCommunication, fixtureSql, "Communication seed must be separated from the Free workspace fixture.");
const guardedFixtureSql = fixtureWithoutCommunication + `
SET LOCAL ROLE service_role;
UPDATE public.workspaces SET plan = 'plus' WHERE id = '${ids.workspace}'::uuid;
INSERT INTO public.communications (
  id, workspace_id, condominium_id, title, body, published, legacy_id, data
)
VALUES (
  '${ids.communication}', '${ids.workspace}', '${ids.condominium}',
  'Plan gate regression', 'Test body', false, 991001,
  '{"audience":"Tutti","date":"2026-11-25","status":"Bozza","publishedToPortal":false,"emailStatus":"Non inviata","emailPreparedAt":""}'::jsonb
);
INSERT INTO public.communication_recipients (
  id, communication_id, workspace_id, condominium_id, member_id, user_id,
  email, name, recipient_role, status, queued_at
)
VALUES (
  '${ids.recipient}', '${ids.communication}', '${ids.workspace}', '${ids.condominium}',
  '${ids.member}', NULL, '${memberEmail}', 'Communication Regression Resident',
  'resident', 'queued', now() - interval '20 minutes'
);
UPDATE public.workspaces SET plan = 'free' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;
`;

const guardedSql = `
BEGIN;
${guardedFixtureSql}
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${ids.admin}', true);

DO $free$
DECLARE
  v_denied boolean;
  v_rows integer;
  v_result jsonb;
  v_count integer;
BEGIN
  v_denied := false;
  BEGIN
    UPDATE public.workspaces SET plan = 'plus' WHERE id = '${ids.workspace}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'WORKSPACE_PLAN_SERVER_MANAGED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_ADMIN_SELF_UPGRADE_NOT_BLOCKED'; END IF;
  -- Private SECURITY DEFINER implementations must not be callable directly by
  -- authenticated clients; public SECURITY INVOKER wrappers delegate to guarded private SECURITY DEFINER functions.
  IF has_function_privilege('authenticated', 'private.prepare_communication_recipients(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'private.reset_stale_communication_recipients(uuid, interval)', 'EXECUTE') THEN
    RAISE EXCEPTION 'AUTHENTICATED_PRIVATE_RECIPIENT_RPC_EXECUTE_MUST_BE_REVOKED';
  END IF;

  v_denied := false;
  BEGIN
    PERFORM private.prepare_communication_recipients('${ids.communication}'::uuid);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'DIRECT_PRIVATE_PREPARE_RPC_BYPASS'; END IF;

  v_denied := false;
  BEGIN
    PERFORM private.reset_stale_communication_recipients('${ids.communication}'::uuid, interval '15 minutes');
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'DIRECT_PRIVATE_RESET_RPC_BYPASS'; END IF;
  IF private.workspace_has_plus_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'FREE_PLAN_HELPER_RETURNED_TRUE';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.communications
  WHERE id = '${ids.communication}'::uuid;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FREE_ADMIN_LOST_COMMUNICATION_READ_ACCESS';
  END IF;

  v_denied := false;
  BEGIN
    UPDATE public.communications
    SET published = true
    WHERE id = '${ids.communication}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_COMMUNICATION_PUBLISH_NOT_BLOCKED'; END IF;

  v_denied := false;
  BEGIN
    INSERT INTO public.communications (workspace_id, condominium_id, title, body, published)
    VALUES ('${ids.workspace}'::uuid, '${ids.condominium}'::uuid, 'Blocked', 'Blocked', false);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_COMMUNICATION_INSERT_NOT_BLOCKED'; END IF;

  v_denied := false;
  BEGIN
    UPDATE public.communication_recipients
    SET email = 'changed-' || '${memberEmail}'
    WHERE id = '${ids.recipient}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_RECIPIENT_IDENTITY_UPDATE_NOT_BLOCKED'; END IF;

  v_denied := false;
  BEGIN
    INSERT INTO public.communication_recipients (
      communication_id, workspace_id, condominium_id, member_id, email, name, recipient_role
    )
    VALUES (
      '${ids.communication}'::uuid, '${ids.workspace}'::uuid, '${ids.condominium}'::uuid,
      '${ids.member}'::uuid, 'extra-' || '${memberEmail}', 'Extra Resident', 'resident'
    );
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_RECIPIENT_INSERT_NOT_BLOCKED'; END IF;

  v_denied := false;
  BEGIN
    PERFORM public.prepare_communication_recipients('${ids.communication}'::uuid);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_RECIPIENT_PREPARATION_NOT_BLOCKED'; END IF;

  v_denied := false;
  BEGIN
    PERFORM public.reset_stale_communication_recipients(
      '${ids.communication}'::uuid,
      interval '15 minutes'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_PLAN_STALE_RECIPIENT_RESET_NOT_BLOCKED'; END IF;

  -- Delivery bookkeeping remains writable by the existing in-flight path.
  UPDATE public.communications
  SET email_status = 'Errore', email_prepared_at = now()
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'FREE_PLAN_STATUS_FINALIZATION_WAS_BLOCKED'; END IF;

  UPDATE public.communication_recipients
  SET status = 'failed', queued_at = NULL
  WHERE id = '${ids.recipient}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'FREE_PLAN_RECIPIENT_STATUS_FINALIZATION_WAS_BLOCKED'; END IF;
END
$free$;

RESET ROLE;

-- Upgrade only through the trusted server role in this disposable database.
SET LOCAL ROLE service_role;
UPDATE public.workspaces SET plan = 'plus' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $plus$
DECLARE
  v_result jsonb;
  v_rows integer;
BEGIN
  IF NOT private.workspace_has_plus_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'PLUS_PLAN_HELPER_RETURNED_FALSE';
  END IF;

  v_denied := false;
  BEGIN
    UPDATE public.communications
    SET published = true,
        data = jsonb_set(jsonb_set(data, '{publishedToPortal}', 'true'::jsonb), '{status}', '"Pubblicata"'::jsonb)
    WHERE id = '${ids.communication}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'PORTAL_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'PLUS_PLAN_PORTAL_PUBLICATION_NOT_BLOCKED'; END IF;

  v_denied := false;
  BEGIN
    INSERT INTO public.communications (workspace_id, condominium_id, title, body, published)
    VALUES ('${ids.workspace}'::uuid, '${ids.condominium}'::uuid, 'Plus portal blocked', 'Body', true);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'PORTAL_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'PLUS_PLAN_PORTAL_INSERT_NOT_BLOCKED'; END IF;

  UPDATE public.communications
  SET title = 'Plus content allowed'
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'PLUS_PLAN_CONTENT_EDIT_FAILED'; END IF;

  v_result := public.prepare_communication_recipients('${ids.communication}'::uuid);
  IF coalesce((v_result->>'recipient_count')::integer, 0) <> 1 THEN
    RAISE EXCEPTION 'PLUS_PLAN_RECIPIENT_PREPARATION_FAILED: %', v_result;
  END IF;

  UPDATE public.communication_recipients
  SET status = 'queued', queued_at = now() - interval '20 minutes'
  WHERE communication_id = '${ids.communication}'::uuid;
  v_result := public.reset_stale_communication_recipients(
    '${ids.communication}'::uuid,
    interval '15 minutes'
  );
  IF coalesce((v_result->>'reset')::integer, 0) <> 1 THEN
    RAISE EXCEPTION 'PLUS_PLAN_STALE_RECIPIENT_RESET_FAILED: %', v_result;
  END IF;

  INSERT INTO public.communications (workspace_id, condominium_id, title, body, published)
  VALUES ('${ids.workspace}'::uuid, '${ids.condominium}'::uuid, 'Plus allowed', 'Body', false);
END
$plus$;

RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.workspaces SET plan = 'professional' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;
SET LOCAL ROLE authenticated;

DO $professional$
DECLARE
  v_denied boolean := false;
BEGIN
  IF NOT private.workspace_has_plus_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'PROFESSIONAL_PLUS_ENTITLEMENT_MISSING';
  END IF;
  BEGIN
    UPDATE public.communications SET published = true
    WHERE id = '${ids.communication}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'PORTAL_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'PROFESSIONAL_PLAN_PORTAL_PUBLICATION_NOT_BLOCKED'; END IF;
END
$professional$;

RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.workspaces SET plan = 'portal' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;
SET LOCAL ROLE authenticated;

DO $portal$
DECLARE
  v_rows integer;
BEGIN
  IF NOT private.workspace_has_portal_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'PORTAL_PLAN_HELPER_RETURNED_FALSE';
  END IF;
  UPDATE public.communications
  SET published = true,
      data = jsonb_set(jsonb_set(data, '{publishedToPortal}', 'true'::jsonb), '{status}', '"Pubblicata"'::jsonb)
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'PORTAL_PLAN_COMMUNICATION_PUBLISH_FAILED'; END IF;
  UPDATE public.communications SET title = 'Portal published edit'
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'PORTAL_PLAN_PUBLISHED_CONTENT_EDIT_FAILED'; END IF;
END
$portal$;

RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.workspaces SET plan = 'plus' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;
SET LOCAL ROLE authenticated;

DO $downgrade$
DECLARE
  v_denied boolean := false;
  v_rows integer;
BEGIN
  IF NOT private.workspace_has_plus_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'PLUS_DOWNGRADE_HELPER_RETURNED_FALSE';
  END IF;
  IF private.workspace_has_portal_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'PLUS_DOWNGRADE_PORTAL_HELPER_RETURNED_TRUE';
  END IF;

  -- A Plus workspace may not edit an existing Portal-published communication.
  BEGIN
    UPDATE public.communications SET title = 'Blocked after Portal downgrade'
    WHERE id = '${ids.communication}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'PORTAL_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'PLUS_DOWNGRADE_PUBLISHED_CONTENT_EDIT_NOT_BLOCKED'; END IF;

  -- Delivery metadata may change while the Portal publication remains live.
  UPDATE public.communications
  SET email_status = 'Errore',
      email_prepared_at = now(),
      data = jsonb_set(jsonb_set(data, '{emailStatus}', '"Errore"'::jsonb), '{emailPreparedAt}', to_jsonb(now()::text))
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'PLUS_DOWNGRADE_STATUS_FINALIZATION_BLOCKED'; END IF;

  -- Unpublishing and its mirrored UI-only JSON fields remain available after downgrade.
  UPDATE public.communications
  SET published = false,
      data = jsonb_set(jsonb_set(data, '{publishedToPortal}', 'false'::jsonb), '{status}', '"Bozza"'::jsonb)
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'PLUS_DOWNGRADE_UNPUBLISH_BLOCKED'; END IF;
END
$downgrade$;

RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.workspaces SET plan = 'free' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;
SET LOCAL ROLE authenticated;

DO $free_downgrade$
DECLARE
  v_denied boolean := false;
  v_rows integer;
BEGIN
  IF private.workspace_has_plus_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'FREE_DOWNGRADE_HELPER_RETURNED_TRUE';
  END IF;
  BEGIN
    UPDATE public.communications SET title = 'Free edit blocked'
    WHERE id = '${ids.communication}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'FREE_DOWNGRADE_CONTENT_EDIT_NOT_BLOCKED'; END IF;

  UPDATE public.communications
  SET email_status = 'Errore',
      email_prepared_at = now(),
      data = jsonb_set(jsonb_set(data, '{emailStatus}', '"Errore"'::jsonb), '{emailPreparedAt}', to_jsonb(now()::text))
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'FREE_DOWNGRADE_STATUS_FINALIZATION_BLOCKED'; END IF;
END
$free_downgrade$;

RESET ROLE;
ROLLBACK;
SELECT 'COMMUNICATIONS_PLUS_PLAN_POSTGRES_PASS';
`;

const output = psql(["-c", guardedSql]);
assert.match(output, /COMMUNICATIONS_PLUS_PLAN_POSTGRES_PASS/);
console.log("PASS PostgreSQL 17: Free workspace cannot publish/create communications, prepare recipients, reset queued recipients or alter recipient identity.");
console.log("PASS PostgreSQL 17: Plus and Professional can create/edit/send communications but cannot publish them to the resident Portal.");
console.log("PASS PostgreSQL 17: Portal can publish and edit published communications.");
console.log("PASS PostgreSQL 17: Portal downgrade blocks further published-content edits but allows delivery finalization and unpublishing.");
console.log("PASS PostgreSQL 17: Free downgrade blocks content edits while preserving delivery-status finalization.");
console.log("PASS PostgreSQL 17: authenticated workspace admins cannot self-upgrade the server-managed plan.");
