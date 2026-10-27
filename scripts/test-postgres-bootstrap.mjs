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
  "20261022213544_restrict_close_member_transfer_execute.sql",
  "20261022233440_align_public_function_execute.sql",
  "20261023000001_revoke_authenticated_maintain.sql",
  "20261023000002_revoke_default_maintain.sql",
  "20261023000003_revoke_service_role_maintain.sql",
  "20261023000004_application_default_table_privileges.sql",
  "20261023000733_use_invoker_for_close_transfer_rpc.sql",
];
const expectedFiles = [...migrationFiles, ...incrementalMigrations].sort();
const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
assert.deepEqual(actualFiles, expectedFiles, "Expected the five baseline migrations followed by the reviewed incremental migrations.");
const migrationsToApply = [...migrationFiles, ...incrementalMigrations];

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
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;",
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
  'btree_gist', (SELECT count(*)::int FROM pg_extension WHERE extname='btree_gist'),
  'relation_owners', (
    SELECT json_object_agg(owner, object_count ORDER BY owner)
    FROM (
      SELECT pg_get_userbyid(c.relowner) AS owner, count(*)::int AS object_count
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p','v','m','S','f')
      GROUP BY pg_get_userbyid(c.relowner)
    ) owners
  ),
  'function_owners', (
    SELECT json_object_agg(owner, object_count ORDER BY owner)
    FROM (
      SELECT pg_get_userbyid(p.proowner) AS owner, count(*)::int AS object_count
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')
      GROUP BY pg_get_userbyid(p.proowner)
    ) owners
  ),
  'schema_owners', (
    SELECT json_object_agg(schema_name, owner ORDER BY schema_name)
    FROM (
      SELECT n.nspname AS schema_name, pg_get_userbyid(n.nspowner) AS owner
      FROM pg_namespace n WHERE n.nspname IN ('public','private')
    ) owners
  )
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
  relation_owners: { postgres: 48 },
  function_owners: { postgres: 171 },
  schema_owners: { private: "postgres", public: "pg_database_owner" },
};
assert.deepEqual(inventory, expected, "Five-file baseline inventory differs from the Production catalog.");
console.log(JSON.stringify({ bootstrap: "BASELINE_ONLY_PASS", engine: "PostgreSQL", applied_migrations: migrationFiles, inventory }, null, 2));

// Validate least-privilege ACL properties before incremental hardening can mask
// a defect in the five-file baseline itself.
const baselineAclSql = `
SELECT json_build_object(
  'authenticated_maintain_relations', (
    SELECT count(*)::int
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','v','m')
      AND has_table_privilege('authenticated', c.oid, 'MAINTAIN')
  ),
  'service_role_maintain_relations', (
    SELECT count(*)::int
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
      AND has_table_privilege('service_role', c.oid, 'MAINTAIN')
  ),
  'default_maintain_grants', (
    SELECT count(*)::int
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclobjtype='r'
      AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole)
      AND a.privilege_type='MAINTAIN'
  ),
  'public_function_execute_targets', (
    SELECT array_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE n.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE'
  )
)::text;`;
const baselineAcl = JSON.parse(psql(["-A", "-t", "-c", baselineAclSql], undefined).trim());
assert.equal(baselineAcl.authenticated_maintain_relations, 0, "Five-file baseline must not grant MAINTAIN to authenticated.");
assert.equal(baselineAcl.service_role_maintain_relations, 0, "Five-file baseline must not grant MAINTAIN to service_role.");
assert.equal(baselineAcl.default_maintain_grants, 0, "Five-file baseline must not create unsafe default MAINTAIN grants.");
assert.deepEqual(baselineAcl.public_function_execute_targets, [
  "private.check_condominium_member_transfer_closure(p_transfer_id uuid)",
  "public.check_condominium_member_transfer_closure(p_transfer_id uuid)",
  "public.normalize_zero_ownership_owner()",
  "public.preserve_closing_condominium_member_history()",
], "Five-file baseline PUBLIC EXECUTE ACL differs from the approved four-function exception set.");
console.log(JSON.stringify({ baseline_acl_validation: "PASS", checks: baselineAcl }, null, 2));

// Only after the baseline passes independently, apply the reviewed incremental
// hardening migrations and verify that they preserve the structural inventory.
for (const filename of incrementalMigrations) {
  console.log(`Applying incremental migration ${filename} to isolated PostgreSQL...`);
  psql(["-f", path.join(directory, filename)]);
}
const finalInventory = JSON.parse(psql(["-A", "-t", "-c", query], undefined).trim());
assert.deepEqual(finalInventory, expected, "Incremental hardening migrations changed the expected structural inventory.");
console.log(JSON.stringify({ incremental_hardening: "PASS", applied_migrations: incrementalMigrations, inventory: finalInventory }, null, 2));

const aclChecksSql = `
WITH target_tables(table_name) AS (
  VALUES
  ('communication_recipients'), ('condominium_accounting_settings'),
  ('condominium_allocation_intakes'), ('condominium_allocation_rules'),
  ('condominium_audit_log'), ('condominium_budgets'),
  ('condominium_consumption_readings'), ('condominium_creation_intakes'),
  ('condominium_expense_allocations'), ('condominium_fiscal_carryover_compensations'),
  ('condominium_fiscal_carryovers'), ('condominium_fiscal_years'),
  ('condominium_fund_availability'), ('condominium_funds'),
  ('condominium_installments'), ('condominium_insurance_policies'),
  ('condominium_ledger_entries'), ('condominium_legal_cases'),
  ('condominium_member_transfers'), ('condominium_millesimal_tables'),
  ('condominium_millesimal_values'), ('condominium_payment_movements'),
  ('condominium_register_items'), ('condominium_suppliers'),
  ('condominium_tax_obligations'), ('condominium_unit_transformation_items'),
  ('condominium_unit_transformations'), ('condominium_units'),
  ('condominium_work_documents'), ('condominium_work_events'),
  ('condominium_work_progress'), ('condominium_works'),
  ('portal_registration_requests'), ('user_security_settings')
),
default_acl_maintain AS (
  SELECT count(*)::int AS n
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclnamespace = 'public'::regnamespace
    AND d.defaclobjtype = 'r'
    AND d.defaclrole = 'postgres'::regrole
    AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole)
    AND a.privilege_type = 'MAINTAIN'
)
SELECT json_build_object(
  'target_table_count', (SELECT count(*)::int FROM target_tables),
  'authenticated_maintain_grants', (
    SELECT count(*)::int
    FROM target_tables t
    JOIN pg_class c ON c.relname=t.table_name
    JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
    WHERE has_table_privilege('authenticated', c.oid, 'MAINTAIN')
  ),
  'service_role_maintain_grants', (
    SELECT count(*)::int
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
      AND has_table_privilege('service_role', c.oid, 'MAINTAIN')
  ),
  'default_maintain_grants', (SELECT n FROM default_acl_maintain),
  'public_function_execute_count', (
    SELECT count(*)::int
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE n.nspname IN ('public', 'private')
      AND a.grantee = 0
      AND a.privilege_type = 'EXECUTE'
  ),
  'public_function_execute_targets', (
    SELECT array_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE n.nspname IN ('public', 'private')
      AND a.grantee = 0
      AND a.privilege_type = 'EXECUTE'
  )
)::text;
`;
const aclChecks = JSON.parse(psql(["-A", "-t", "-c", aclChecksSql], undefined).trim());
assert.equal(aclChecks.target_table_count, 34, "Expected the 34 reviewed tables in the MAINTAIN remediation.");
assert.equal(aclChecks.authenticated_maintain_grants, 0, "authenticated still has MAINTAIN on a remediated table.");
assert.equal(aclChecks.service_role_maintain_grants, 0, "service_role still has MAINTAIN on a public relation.");
assert.equal(aclChecks.default_maintain_grants, 0, "MAINTAIN remains in postgres-owned default ACLs for anon/authenticated.");
assert.equal(aclChecks.public_function_execute_count, 4, "PUBLIC EXECUTE differs from the four-function Production ACL baseline.");
assert.deepEqual(aclChecks.public_function_execute_targets, [
  "private.check_condominium_member_transfer_closure(p_transfer_id uuid)",
  "public.check_condominium_member_transfer_closure(p_transfer_id uuid)",
  "public.normalize_zero_ownership_owner()",
  "public.preserve_closing_condominium_member_history()",
], "PUBLIC EXECUTE is present on unexpected functions or missing from expected functions.");
console.log(JSON.stringify({ acl_remediation: "PASS", checks: aclChecks }, null, 2));

const transferChecksSql = `
SELECT json_build_object(
  'public_wrapper_exists', to_regprocedure('public.close_condominium_member_transfer(uuid)') IS NOT NULL,
  'private_implementation_exists', to_regprocedure('private.close_condominium_member_transfer(uuid)') IS NOT NULL,
  'anon_denied_public_wrapper', NOT has_function_privilege('anon', 'public.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'authenticated_can_call_wrapper', has_function_privilege('authenticated', 'public.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'public_wrapper_is_invoker', (SELECT NOT prosecdef FROM pg_proc WHERE oid=to_regprocedure('public.close_condominium_member_transfer(uuid)')),
  'private_not_executable_by_anon', NOT has_function_privilege('anon', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE'),
  'private_callable_by_authenticated_for_invoker_wrapper', has_function_privilege('authenticated', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE'),
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
const functionalTransferSql = `
BEGIN;
SET LOCAL search_path = public, private, auth, extensions;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
INSERT INTO auth.users (id) VALUES ('11111111-1111-4111-8111-111111111111');
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
 ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', 'Outgoing owner', 'resident', true, '{"current_owner":true}'::jsonb, '44444444-4444-4444-8444-444444444444'),
 ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', 'Incoming owner', 'resident', true, '{"current_owner":true}'::jsonb, '44444444-4444-4444-8444-444444444444');
INSERT INTO auth.users (id) VALUES ('99999999-9999-4999-8999-999999999999');
INSERT INTO public.profiles (id, full_name, email, role, active)
VALUES ('99999999-9999-4999-8999-999999999999', 'CI unauthorized user', 'ci-outsider@example.invalid', 'admin', true);
INSERT INTO public.workspaces (id, name, plan)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CI other workspace', 'professional');
INSERT INTO public.workspace_members (workspace_id, user_id, role, active, permissions)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '99999999-9999-4999-8999-999999999999', 'admin', true, '{}'::jsonb);
INSERT INTO public.condominium_member_transfers
 (id, workspace_id, condominium_id, unit_id, outgoing_member_id, incoming_member_id, transfer_date, status, data, created_by)
VALUES
 ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666', DATE '2026-10-01', 'Confermato', '{}'::jsonb, '11111111-1111-4111-8111-111111111111');

-- Negative authorization tests: outsider in a different workspace and no authenticated identity.
DO $authz$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
  BEGIN
    PERFORM public.close_condominium_member_transfer('77777777-7777-4777-8777-777777777777');
    RAISE EXCEPTION 'UNAUTHORIZED_USER_CLOSED_TRANSFER';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT IN ('FORBIDDEN') THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_member_transfers WHERE id='77777777-7777-4777-8777-777777777777' AND status='Confermato' AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_ATTEMPT_CHANGED_TRANSFER';
  END IF;

  EXECUTE 'RESET request.jwt.claim.sub';
  BEGIN
    PERFORM public.close_condominium_member_transfer('77777777-7777-4777-8777-777777777777');
    RAISE EXCEPTION 'ANONYMOUS_USER_CLOSED_TRANSFER';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT IN ('AUTH_REQUIRED') THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.condominium_member_transfers WHERE id='77777777-7777-4777-8777-777777777777' AND status='Confermato' AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'ANONYMOUS_ATTEMPT_CHANGED_TRANSFER';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
END;
$authz$;

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
  VALUES ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'CI unpaid installment', 100, 0, 'Da pagare');

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
`;
psql(["-v", "ON_ERROR_STOP=1"], functionalTransferSql);
console.log(JSON.stringify({
  transfer_functional_test: "PASS",
  assertions: [
    "unauthenticated caller is rejected with AUTH_REQUIRED and cannot mutate transfer",
    "authenticated outsider is rejected with FORBIDDEN and cannot mutate transfer",
    "authorized workspace admin closes and records closed_at/closed_by",
    "outgoing owner archived and current_owner=false",
    "incoming owner remains active",
    "open unpaid installment blocks closure",
    "failed closure leaves transfer and owner unchanged",
    "test fixtures rolled back"
  ]
}, null, 2));
