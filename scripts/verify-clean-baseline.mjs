import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const directory = "supabase/migrations";
const ledgerPath = "supabase/rebuild/production-ledger-20261017.json";
const expectedFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];

const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
const baselineFiles = actualFiles.filter((name) => expectedFiles.includes(name));
const incrementalFiles = actualFiles.filter((name) => !expectedFiles.includes(name));
assert.deepEqual(baselineFiles, expectedFiles, "The clean branch must contain the five ordered baseline migrations.");
for (const name of incrementalFiles) {
  assert.match(name, /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/, `Invalid incremental migration filename: ${name}`);
}
assert.equal(new Set(actualFiles.map((name) => name.slice(0, 14))).size, actualFiles.length, "Duplicate migration version detected.");
assert.ok(incrementalFiles.every((name) => name.slice(0, 14) > expectedFiles.at(-1).slice(0, 14)), "Incremental migrations must follow the five baseline migrations.");

const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
assert.equal(ledger.project_ref, "tctcgptrsmvgajqjgnev", "The ledger must be the captured BETHAG Production ledger.");
assert.equal(ledger.count, ledger.migrations.length, "Production ledger count does not match its records.");
assert.equal(ledger.count, 244, "Refresh the captured Production ledger and update this assertion if Production history changes.");

const ledgerVersions = ledger.migrations.map(({ version }) => version);
assert.ok(ledgerVersions.every((version) => /^\d{14}$/.test(version)), "Every Production migration version must be 14 digits.");
assert.equal(new Set(ledgerVersions).size, ledgerVersions.length, "Production ledger contains duplicate migration versions.");
assert.deepEqual(ledgerVersions, [...ledgerVersions].sort(), "Production ledger versions must be in ascending order.");

const baselineVersions = expectedFiles.map((name) => name.slice(0, 14));
const allMigrationVersions = actualFiles.map((name) => name.slice(0, 14));
assert.equal(new Set(baselineVersions).size, baselineVersions.length, "Baseline contains duplicate migration versions.");
assert.ok(baselineVersions.every((version) => /^\d{14}$/.test(version)), "Every baseline version must be 14 digits.");
const latestProductionVersion = ledgerVersions.at(-2);
assert.ok(
  allMigrationVersions.every((version) => version > latestProductionVersion),
  "Baseline versions must follow the latest captured Production migration version.",
);

const sql = Object.fromEntries(await Promise.all(expectedFiles.map(async (name) => [
  name,
  await readFile(`${directory}/${name}`, "utf8"),
])));
const count = (text, pattern) => (text.match(pattern) ?? []).length;

// Fail fast if a table is missing either RLS activation or at least one policy.
const tableNames = [...sql[expectedFiles[0]].matchAll(/CREATE TABLE "public"\."([^"]+)"/g)]
  .map(([, name]) => name)
  .sort();
const rlsEnabledTableNames = [...sql[expectedFiles[0]].matchAll(/ALTER TABLE "public"\."([^"]+)" ENABLE ROW LEVEL SECURITY;/g)]
  .map(([, name]) => name)
  .sort();
const policyTableNames = [...new Set([...sql[expectedFiles[3]].matchAll(/CREATE POLICY .*? ON "public"\."([^"]+)"/g)]
  .map(([, name]) => name))]
  .sort();
assert.equal(tableNames.length, 47, "Expected 47 public tables in the baseline.");
assert.deepEqual(rlsEnabledTableNames, tableNames, "Every public table must have RLS enabled exactly once.");
assert.deepEqual(policyTableNames, tableNames, "Every public table must have at least one RLS policy.");

const result = {
  migration_files: actualFiles.length,
  baseline_migration_files: expectedFiles.length,
  incremental_migration_files: incrementalFiles.length,
  production_ledger_records: ledger.count,
  production_latest_version: latestProductionVersion,
  baseline_versions: baselineVersions,
  tables: count(sql[expectedFiles[0]], /^CREATE TABLE /gm),
  constraints: count(sql[expectedFiles[0]], /^ALTER TABLE .* ADD CONSTRAINT /gm),
  indexes: count(sql[expectedFiles[1]], /^CREATE (?:UNIQUE )?INDEX /gm),
  views: count(sql[expectedFiles[1]], /^CREATE OR REPLACE VIEW /gm),
  functions: count(sql[expectedFiles[2]], /^CREATE OR REPLACE (?:FUNCTION|PROCEDURE)\b/gm),
  policies: count(sql[expectedFiles[3]], /^CREATE POLICY /gm),
  triggers: count(sql[expectedFiles[3]], /^CREATE (?:CONSTRAINT )?TRIGGER /gm),
  grant_statements: count(sql[expectedFiles[4]], /^GRANT /gm),
  default_privilege_statements: count(sql[expectedFiles[4]], /^ALTER DEFAULT PRIVILEGES /gm),
  grants: count(sql[expectedFiles[4]], /^GRANT /gm) + count(sql[expectedFiles[4]], /^ALTER DEFAULT PRIVILEGES /gm),
};

assert.equal(result.tables, 47, "Production catalog table count changed.");
assert.equal(result.constraints, 304, "Production table-constraint count changed.");
assert.equal(result.indexes, 193, "Unexpected baseline index count.");
assert.equal(result.views, 1, "Expected the production fund-availability view.");
assert.equal(result.functions, 171, "Production function/procedure count changed.");
assert.equal(result.policies, 103, "Production RLS policy count changed.");
assert.equal(result.triggers, 146, "Production trigger count changed.");
assert.equal(
  result.grants,
  388,
  `Baseline grant/default-privilege count changed: expected 388 total, got ${result.grants} (${result.grant_statements} GRANT and ${result.default_privilege_statements} ALTER DEFAULT PRIVILEGES statements).`,
);

console.log(JSON.stringify({
  baseline_catalog_validation: "PASS",
  production_ledger_integrity: "PASS",
  migration_history_cutover: "NOT_APPLIED",
  cutover_note: "This validates the captured ledger and baseline ordering only. It does not reconcile the remote schema_migrations table; do not run db push until the cutover procedure is explicitly executed and verified.",
  ...result,
}, null, 2));
