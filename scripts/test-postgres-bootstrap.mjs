import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const directory = "supabase/migrations";
const migrationFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const incrementalMigrations = [
  "20261022202747_harden_close_member_transfer_search_path.sql",
  "20261022210629_restrict_private_function_public_execute.sql",
  "20261022210630_harden_default_privileges_and_private_execute.sql",
  "20261022213000_restrict_close_member_transfer_execute.sql",
];
const expectedFiles = [...migrationFiles, ...incrementalMigrations].sort();
const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
assert.deepEqual(actualFiles, expectedFiles, "Expected the five baseline migrations followed by the four reviewed hardening migrations.");
const migrationsToApply = actualFiles;

function psql(args, input) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    input,
  });
}

const grantSql = await readFile(path.join(directory, migrationFiles[4]), "utf8");
const roles = new Set(["anon", "authenticated", "service_role", "authenticator", "supabase_admin"]);
for (const pattern of [
  /\bTO\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
  /\bFOR\s+ROLE\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
]) {
  for (const match of grantSql.matchAll(pattern)) {
    const role = (match[1] ?? match[2]).replace(/""/g, '"');
    if (!["PUBLIC", "public", "postgres"].includes(role)) roles.add(role);
  }
}

const bootstrapSql = [
  "CREATE SCHEMA IF NOT EXISTS auth;",
  "CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);",
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $;",
  "CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;",
  "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;",
  ...[...roles].sort().filter((role) => role !== "postgres").map((role) => {
    const identifier = role.replace(/"/g, '""');
    const literal = role.replace(/'/g, "''");
    return `DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${literal}') THEN CREATE ROLE "${identifier}" NOLOGIN; END IF; END $role$;`;
  }),
].join("\n");
psql(["-c", bootstrapSql]);

for (const filename of migrationsToApply) {
  console.log(`Applying ${filename} to isolated PostgreSQL...`);
  psql(["-f", path.join(directory, filename)]);
}

const query = `
SELECT json_build_object(
  'tables', (SELECT count(*)::int FROM information_schema.tables WHERE table_schema IN ('public','private') AND table_type = 'BASE TABLE'),
  'columns', (SELECT count(*)::int FROM information_schema.columns WHERE table_schema IN ('public','private')),
  'constraints', (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private') AND c.contype <> 't'),
  'exclusion_constraints', (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private') AND c.contype = 'x'),
  'indexes', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='i'),
  'views', (SELECT count(*)::int FROM information_schema.views WHERE table_schema IN ('public','private')),
  'functions', (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')),
  'policies', (SELECT count(*)::int FROM pg_policies WHERE schemaname IN ('public','private')),
  'rls_enabled_tables', (SELECT count(*)::int FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('public','private') AND t.relkind IN ('r','p') AND t.relrowsecurity),
  'rls_policy_tables', (SELECT count(DISTINCT schemaname || '.' || tablename)::int FROM pg_policies WHERE schemaname IN ('public','private')),
  'triggers', (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND NOT t.tgisinternal),
  'btree_gist', (SELECT count(*)::int FROM pg_extension WHERE extname='btree_gist')
)::text;
`;
const result = psql(["-A", "-t", "-c", query], undefined).trim();
const inventory = JSON.parse(result);
const expected = {
  tables: 47,
  columns: 626,
  constraints: 304,
  exclusion_constraints: 1,
  indexes: 257,
  views: 1,
  functions: 171,
  policies: 103,
  rls_enabled_tables: 47,
  rls_policy_tables: 47,
  triggers: 146,
  btree_gist: 1,
};
assert.deepEqual(inventory, expected, "Real PostgreSQL baseline inventory differs from the Production catalog.");
console.log(JSON.stringify({ bootstrap: "PASS", engine: "PostgreSQL", inventory }, null, 2));

const transferChecksSql = `
SELECT json_build_object(
  'public_wrapper_exists', to_regprocedure('public.close_condominium_member_transfer(uuid)') IS NOT NULL,
  'private_implementation_exists', to_regprocedure('private.close_condominium_member_transfer(uuid)') IS NOT NULL,
  'anon_denied_public_wrapper', NOT has_function_privilege('anon', 'public.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'authenticated_can_call_wrapper', has_function_privilege('authenticated', 'public.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'private_not_executable_by_anon', NOT has_function_privilege('anon', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'private_not_executable_by_authenticated', NOT has_function_privilege('authenticated', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'public_wrapper_search_path_empty', (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid=to_regprocedure('public.close_condominium_member_transfer(uuid)')),
  'private_implementation_search_path_empty', (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid=to_regprocedure('private.close_condominium_member_transfer(uuid)')),
  'checks_authentication', (SELECT position('AUTH_REQUIRED' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0),
  'checks_workspace_permission', (SELECT position('can_manage_workspace_module' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0),
  'rejects_open_financial_positions', (SELECT position('TRANSFER_FINANCIAL_POSITIONS_OPEN' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0),
  'rejects_ownership_share_closure', (SELECT position('TRANSFER_QUOTA_NOT_CLOSABLE' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0),
  'archives_outgoing_member', (SELECT position('position_status' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0 AND position('active=false' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0),
  'marks_transfer_closed', (SELECT position('financial_positions_closed' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0 AND position('status=''Chiuso''' in pg_get_functiondef(to_regprocedure('private.close_condominium_member_transfer(uuid)'))) > 0)
)::text;
`;
const transferChecks = JSON.parse(psql(["-A", "-t", "-c", transferChecksSql], undefined).trim());
for (const [check, passed] of Object.entries(transferChecks)) {
  assert.equal(passed, true, `Transfer closure security/invariant check failed: ${check}`);
}
console.log(JSON.stringify({ transfer_closure_security_and_invariants: "PASS", checks: transferChecks }, null, 2));


// End-to-end transfer closure test on disposable PostgreSQL fixtures.
// Every fixture is inside a transaction that is rolled back at the end.
const functionalTransferSql = \`
BEGIN;
SET LOCAL search_path = public, private, auth, extensions;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
INSERT INTO public.profiles (id, full_name, email, role, active)
VALUES ('11111111-1111-4111-8111-111111111111', 'CI transfer admin', 'ci-transfer-admin@example.invalid', 'admin', true);
INSERT INTO public.workspaces (id, name, plan)
VALUES ('22222222-2222-4222-8222-222222222222', 'CI transfer workspace', 'professional');
INSERT INTO public.workspace_members (workspace_id, user_id, role, active, permissions)
VALUES ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'admin', true, '{}'::jsonb);
INSERT INTO public.condominiums (id, workspace_id, name)
VALUES ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'CI transfer condominium');
INSERT INTO public.condominium_units (id, workspace_id, condominium_id, unit_code)
VALUES ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'CI-01');
INSERT INTO public.condominium_members (id, condominium_id, name, role, active, data, unit_id)
VALUES
 ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', 'Outgoing owner', 'owner', true, '{"current_owner":true}'::jsonb, '44444444-4444-4444-8444-444444444444'),
 ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', 'Incoming owner', 'owner', true, '{"current_owner":true}'::jsonb, '44444444-4444-4444-8444-444444444444');
INSERT INTO public.condominium_member_transfers
 (id, workspace_id, condominium_id, unit_id, outgoing_member_id, incoming_member_id, transfer_date, status, data, created_by)
VALUES
 ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666', DATE '2026-10-01', 'Confermato', '{}'::jsonb, '11111111-1111-4111-8111-111111111111');

DO $test$
DECLARE v_ok boolean;
BEGIN
  v_ok := public.close_condominium_member_transfer('77777777-7777-4777-8777-777777777777');
  IF v_ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'POSITIVE_CLOSE_RETURNED_FALSE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_member_transfers WHERE id='77777777-7777-4777-8777-777777777777' AND status='Chiuso' AND closed_at IS NOT NULL AND closed_by='11111111-1111-4111-8111-111111111111' AND data->>'financial_positions_closed'='true') THEN RAISE EXCEPTION 'TRANSFER_NOT_CLOSED_CORRECTLY'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_members WHERE id='55555555-5555-4555-8555-555555555555' AND active=false AND data->>'position_status'='Archiviato' AND data->>'current_owner'='false') THEN RAISE EXCEPTION 'OUTGOING_OWNER_NOT_ARCHIVED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_members WHERE id='66666666-6666-4666-8666-666666666666' AND active=true) THEN RAISE EXCEPTION 'INCOMING_OWNER_NOT_RETAINED'; END IF;

  INSERT INTO public.condominium_member_transfers
   (id, workspace_id, condominium_id, unit_id, outgoing_member_id, incoming_member_id, transfer_date, status, data, created_by)
  VALUES
   ('88888888-8888-4888-8888-888888888888', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666666', '55555555-5555-4555-8555-555555555555', DATE '2026-10-02', 'Confermato', '{}'::jsonb, '11111111-1111-4111-8111-111111111111');
  INSERT INTO public.condominium_installments (workspace_id, condominium_id, member_id, unit_id, title, amount, paid_amount, status)
  VALUES ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'CI unpaid installment', 100, 25, 'Da pagare');

  BEGIN
    PERFORM public.close_condominium_member_transfer('88888888-8888-4888-8888-888888888888');
    RAISE EXCEPTION 'OPEN_BALANCE_WAS_NOT_REJECTED';
  EXCEPTION WHEN OTHERS THEN
    IF position('TRANSFER_FINANCIAL_POSITIONS_OPEN' IN SQLERRM)=0 THEN RAISE; END IF;
  END;

  IF NOT EXISTS (SELECT 1 FROM public.condominium_member_transfers WHERE id='88888888-8888-4888-8888-888888888888' AND status='Confermato' AND closed_at IS NULL) THEN RAISE EXCEPTION 'FAILED_CLOSURE_DID_NOT_ROLL_BACK_TRANSFER'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_members WHERE id='66666666-6666-4666-8666-666666666666' AND active=true AND coalesce(data->>'position_status','') <> 'Archiviato') THEN RAISE EXCEPTION 'FAILED_CLOSURE_DID_NOT_ROLL_BACK_OWNER'; END IF;
END;
$test$;
ROLLBACK;
\`;
psql(["-v", "ON_ERROR_STOP=1"], functionalTransferSql);
console.log(JSON.stringify({
  transfer_functional_test: "PASS",
  assertions: [
    "confirmed transfer closes and records closed_at/closed_by",
    "outgoing owner archived and current_owner=false",
    "incoming owner remains active",
    "open unpaid installment blocks closure",
    "failed closure leaves transfer and owner unchanged",
    "test fixtures rolled back"
  ]
}, null, 2));
