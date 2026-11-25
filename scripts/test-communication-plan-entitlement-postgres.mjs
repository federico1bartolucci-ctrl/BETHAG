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
  secondCommunication: randomUUID(),
  secondRecipient: randomUUID(),
};
const email = "communication-plan-" + ids.admin + "@example.invalid";
const memberEmail = "resident-" + ids.member + "@example.invalid";

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
console.log("PASS baseline reproduction: a Free workspace admin can publish a communication, prepare recipients and reset queued delivery rows.");

const migration = "supabase/rebuild/proposed-forward-migrations/20261125141500_require_plus_plan_for_communications.sql";
psql(["-f", migration]);

const guardedSql = `
BEGIN;
${fixtureSql}
INSERT INTO public.communication_recipients (
  id, communication_id, workspace_id, condominium_id, member_id, user_id,
  email, name, recipient_role, status, queued_at
)
VALUES (
  '${ids.recipient}', '${ids.communication}', '${ids.workspace}', '${ids.condominium}',
  '${ids.member}', NULL, '${memberEmail}', 'Communication Regression Resident',
  'resident', 'queued', now() - interval '20 minutes'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${ids.admin}', true);

DO $free$
DECLARE
  v_denied boolean;
  v_rows integer;
  v_result jsonb;
  v_count integer;
BEGIN
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

  -- Delivery bookkeeping must remain possible after downgrade/in-flight sends.
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

  UPDATE public.communications
  SET published = true
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'PLUS_PLAN_COMMUNICATION_PUBLISH_FAILED'; END IF;

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
UPDATE public.workspaces SET plan = 'free' WHERE id = '${ids.workspace}'::uuid;
RESET ROLE;
SET LOCAL ROLE authenticated;

DO $downgrade$
DECLARE
  v_denied boolean;
  v_rows integer;
BEGIN
  IF private.workspace_has_plus_plan('${ids.workspace}'::uuid) THEN
    RAISE EXCEPTION 'DOWNGRADED_PLAN_HELPER_RETURNED_TRUE';
  END IF;

  v_denied := false;
  BEGIN
    UPDATE public.communications
    SET title = 'Blocked after downgrade'
    WHERE id = '${ids.communication}'::uuid;
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'COMMUNICATIONS_PLAN_REQUIRED' THEN RAISE; END IF;
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'DOWNGRADED_PLAN_CONTENT_UPDATE_NOT_BLOCKED'; END IF;

  -- Unpublishing and delivery status finalization remain available for cleanup.
  UPDATE public.communications
  SET published = false, email_status = 'Errore'
  WHERE id = '${ids.communication}'::uuid;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'DOWNGRADED_PLAN_UNPUBLISH_OR_STATUS_UPDATE_BLOCKED'; END IF;
END
$downgrade$;

RESET ROLE;
ROLLBACK;
SELECT 'COMMUNICATIONS_PLUS_PLAN_POSTGRES_PASS';
`;

const output = psql(["-c", guardedSql]);
assert.match(output, /COMMUNICATIONS_PLUS_PLAN_POSTGRES_PASS/);
console.log("PASS PostgreSQL 17: Free workspace cannot publish/create communications, prepare recipients, reset queued recipients or alter recipient identity.");
console.log("PASS PostgreSQL 17: Plus workspace can publish, prepare and recover stale recipient queues.");
console.log("PASS PostgreSQL 17: delivery-status finalization and unpublishing remain available after downgrade.");
