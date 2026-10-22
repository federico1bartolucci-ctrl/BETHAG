import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const ledgerPath = "supabase/rebuild/production-ledger-20261017.json";
const migrationsDirectory = "supabase/migrations";
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();

assert.equal(ledger.count, ledger.migrations.length, "Production ledger count mismatch.");
assert.equal(new Set(ledger.migrations.map((item) => item.version)).size, ledger.migrations.length, "Duplicate Production migration version.");
assert.equal(ledger.count, 243, "Refresh the Production ledger snapshot before generating a cutover plan.");

const baseline = migrationFiles.map((name) => {
  const match = /^(\d{14})_[a-z0-9][a-z0-9_-]*\.sql$/.exec(name);
  assert.ok(match, `Invalid baseline migration filename: ${name}`);
  return match[1];
});
assert.equal(migrationFiles.length, 5, "Expected exactly five baseline migrations.");
assert.equal(new Set(baseline).size, baseline.length, "Duplicate baseline migration version.");
assert.ok(baseline.every((version) => version > ledger.migrations.at(-1).version), "Baseline must follow the latest Production migration.");

const report = {
  production_project_ref: ledger.project_ref,
  production_records_to_reconcile: ledger.migrations.length,
  baseline_records_to_register: baseline.length,
  incremental_migrations_after_baseline: incrementalFiles.map((name) => ({ name, version: parseVersion(name) })),
  production_latest_version: ledger.migrations.at(-1).version,
  baseline_versions: baseline,
  action: "NOT_EXECUTED",
  warning: "Generated commands change only Supabase migration tracking, not schema or application data. Do not execute until the baseline has been semantically verified against Production and a recovery point is confirmed.",
};
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--print-commands")) {
  const reverted = ledger.migrations.map((item) => item.version).join(" ");
  console.log("\n# Tracking-only cutover commands; execute only after independent approval and verified baseline parity.");
  console.log(`supabase migration repair --status reverted ${reverted}`);
  console.log(`supabase migration repair --status applied ${baseline.join(" ")}`);
}
