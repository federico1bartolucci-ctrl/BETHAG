import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const directory = "supabase/migrations";
const migrationFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const baselineFiles = actualFiles.filter((name) => migrationFiles.includes(name));
assert.deepEqual(baselineFiles, migrationFiles, "Expected the five ordered baseline migrations.");
const incrementalFiles = actualFiles.filter((name) => !migrationFiles.includes(name));
for (const name of incrementalFiles) {
  assert.match(name, /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/, "Invalid incremental migration filename: " + name);
}
assert.equal(new Set(actualFiles.map((name) => name.slice(0, 14))).size, actualFiles.length, "Duplicate migration version detected.");

const migrations = await Promise.all(migrationFiles.map((name) => readFile(`${directory}/${name}`, "utf8")));
const [schemaSql, indexSql, functionSql, securitySql, grantSql] = migrations;
function extractBaselineFunction(sql, signature) {
  const start = sql.indexOf(signature);
  if (start === -1) return "";
  const opening = sql.indexOf("$function$", start);
  const closing = sql.indexOf("$function$", opening + "$function$".length);
  if (opening === -1 || closing === -1) return "";
  return sql.slice(start, closing + "$function$".length).replace(/--[^\n]*/g, "");
}
const paymentSyncFunction = extractBaselineFunction(functionSql, "CREATE OR REPLACE FUNCTION public.sync_condominium_installment_from_payments");
const paymentTriggerFunction = paymentSyncFunction;
assert.match(paymentTriggerFunction, /pg_advisory_xact_lock[\s\S]*hashtextextended/, "Payment trigger reconciliation must acquire an advisory transaction lock.");
assert.match(paymentTriggerFunction, /v_workspace_id::text/);
assert.match(paymentTriggerFunction, /v_condominium_id::text/);
assert.match(paymentTriggerFunction, /v_ledger_entry_id::text/);
assert.match(paymentTriggerFunction, /pg_advisory_xact_lock[\\s\\S]*for update/i, "Payment trigger must acquire the ledger advisory lock before locking the installment to avoid lock-order races.");
assert.match(paymentSyncFunction, /select sum\(i\.paid_amount\)[\s\S]*i\.ledger_entry_id=a\.ledger_entry_id[\s\S]*i\.unit_id=a\.unit_id/, "Payment trigger must reconcile allocation paid totals across all installments for the same ledger entry, unit and owner.");
assert.doesNotMatch(paymentSyncFunction, /update\s+public\.condominium_expense_allocations[\s\S]{0,500}set\s+paid_amount\s*=\s*v_paid\b/i, "Payment trigger must not overwrite cumulative allocation paid totals with only the current installment's paid amount.");
const unifiedPaymentSync = paymentSyncFunction.slice(paymentSyncFunction.indexOf("if v_unit_id is null and v_member_id is not null"), paymentSyncFunction.indexOf("else\n    update public.condominium_expense_allocations"));
assert.match(unifiedPaymentSync, /sum\(i\.paid_amount\)[\s\S]*i\.ledger_entry_id[\s\S]*i\.unit_id is null[\s\S]*i\.member_id=v_member_id/, "Unified installment payments must reconcile cumulative paid totals by ledger entry and owner.");
const registerPaymentStart = functionSql.indexOf("CREATE OR REPLACE FUNCTION private.register_condominium_installment_payment");
const registerPaymentNext = functionSql.indexOf("CREATE OR REPLACE FUNCTION", registerPaymentStart + 1);
const registerPaymentFunction = functionSql.slice(registerPaymentStart, registerPaymentNext === -1 ? undefined : registerPaymentNext).replace(/--[^\n]*/g, "");
assert.match(registerPaymentFunction, /pg_advisory_xact_lock/, "Payment reconciliation must serialize concurrent payments across installments of the same ledger entry.");
assert.match(registerPaymentFunction, /p_workspace_id::text/, "Payment reconciliation lock must include workspace.");
assert.match(registerPaymentFunction, /p_condominium_id::text/, "Payment reconciliation lock must include condominium.");
assert.match(registerPaymentFunction, /v_ledger_entry_id::text/, "Payment reconciliation lock must include ledger entry.");
const unifiedRegisterPayment = registerPaymentFunction.slice(registerPaymentFunction.indexOf("if v_installment.unit_id is null and v_installment.member_id is not null"), registerPaymentFunction.indexOf("else\n      /*"));
assert.match(unifiedRegisterPayment, /sum\(i\.paid_amount\)[\s\S]*i\.ledger_entry_id=v_installment\.ledger_entry_id[\s\S]*i\.unit_id is null[\s\S]*i\.member_id=v_member_id/, "Manual unified installment payment registration must reconcile cumulative totals across installments.");
const count = (text, pattern) => (text.match(pattern) ?? []).length;
const inventory = {
  migration_files: migrationFiles.length,
  tables: count(schemaSql, /^CREATE TABLE /gm),
  constraints: count(schemaSql, /^ALTER TABLE .* ADD CONSTRAINT /gm),
  indexes: count(indexSql, /^CREATE (?:UNIQUE )?INDEX /gm),
  views: count(indexSql, /^CREATE OR REPLACE VIEW /gm),
  functions: count(functionSql, /^CREATE OR REPLACE (?:FUNCTION|PROCEDURE)\b/gm),
  policies: count(securitySql, /^CREATE POLICY /gm),
  triggers: count(securitySql, /^CREATE (?:CONSTRAINT )?TRIGGER /gm),
  grants: count(grantSql, /^GRANT /gm) + count(grantSql, /^ALTER DEFAULT PRIVILEGES /gm),
};
assert.deepEqual(inventory, {
  migration_files: 5, tables: 47, constraints: 304, indexes: 193, views: 1,
  functions: 171, policies: 103, triggers: 146, grants: 378,
}, "Clean baseline inventory differs from the expected five-migration rebuild.");

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
  `);

  const roles = new Set(["anon", "authenticated", "service_role", "authenticator", "supabase_admin"]);
  for (const match of grantSql.matchAll(/\bTO\s+("(?:""|[^"])+")/g)) {
    const role = match[1].slice(1, -1).replace(/""/g, '"');
    if (role.toUpperCase() !== "PUBLIC" && role !== "postgres") roles.add(role);
  }
  for (const match of grantSql.matchAll(/\bFOR ROLE\s+("(?:""|[^"])+")/g)) {
    const role = match[1].slice(1, -1).replace(/""/g, '"');
    if (role !== "postgres") roles.add(role);
  }
  for (const role of [...roles].sort()) {
    const existing = await db.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    if (existing.rows.length === 0) {
      await db.exec(`CREATE ROLE "${role.replace(/"/g, '""')}"`);
    }
  }

  // PGlite does not bundle btree_gist; the Supabase baseline enables it above.
  // Skip only the one exclusion constraint that depends on this external extension in the isolated parser test.
  migrations[0] = migrations[0]
    .replace(/^CREATE EXTENSION IF NOT EXISTS .*;\s*$/gm, "")
    .replace(/^ALTER TABLE .* ADD CONSTRAINT .* EXCLUDE USING gist .*;\s*$/gm, "");

  for (let i = 0; i < migrations.length; i += 1) {
    try {
      await db.exec(migrations[i]);
    } catch (error) {
      throw new Error(`Baseline migration ${migrationFiles[i]} failed: ${error.message}`, { cause: error });
    }
  }

  const [tableCount, functionCount, policyCount, triggerCount, viewCount] = await Promise.all([
    db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema IN ('public','private') AND table_type='BASE TABLE'"),
    db.query("SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')"),
    db.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname IN ('public','private')"),
    db.query("SELECT count(*)::int AS n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND NOT t.tgisinternal"),
    db.query("SELECT count(*)::int AS n FROM information_schema.views WHERE table_schema IN ('public','private')"),
  ]);
  const constraintCount = await db.query("SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private') AND c.contype <> 't'");
  assert.equal(tableCount.rows[0].n, 47, "Fresh bootstrap table count mismatch.");
  assert.equal(constraintCount.rows[0].n, 303, "Fresh bootstrap constraint count mismatch after the extension-only exclusion constraint is skipped.");
  assert.equal(functionCount.rows[0].n, 171, "Fresh bootstrap function count mismatch.");
  assert.equal(policyCount.rows[0].n, 103, "Fresh bootstrap RLS policy count mismatch.");
  assert.equal(triggerCount.rows[0].n, 146, "Fresh bootstrap trigger count mismatch.");
  assert.equal(viewCount.rows[0].n, 1, "Fresh bootstrap view count mismatch.");
  console.log(JSON.stringify({ bootstrap: "PASS", inventory, roles_created: roles.size, extension_dependent_constraints_skipped: 1 }, null, 2));
} finally {
  await db.close();
}
