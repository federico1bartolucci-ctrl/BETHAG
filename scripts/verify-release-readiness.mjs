import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

// Fail-closed release gate for the clean BETHAG baseline.
// This script deliberately does not connect to or modify Production.
const ledger = JSON.parse(await readFile("supabase/rebuild/production-ledger-20261017.json", "utf8"));
const migrationFiles = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();
const expectedBaselineFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const baselineFiles = migrationFiles.filter((name) => expectedBaselineFiles.includes(name));
const incrementalFiles = migrationFiles.filter((name) => !expectedBaselineFiles.includes(name));
const baselineVersions = baselineFiles.map((name) => name.slice(0, 14));
const allVersions = migrationFiles.map((name) => name.slice(0, 14));

const blockers = [];
if (ledger.count !== ledger.migrations.length) blockers.push("Captured Production migration ledger count is inconsistent.");
if (ledger.count !== 244) blockers.push("Captured Production migration ledger is stale; refresh it from the live project.");
if (JSON.stringify(baselineFiles) !== JSON.stringify(expectedBaselineFiles)) blockers.push("The five ordered baseline migrations are missing or out of order.");
if (new Set(allVersions).size !== allVersions.length) blockers.push("Duplicate migration versions detected.");
if (incrementalFiles.some((name) => !/^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/.test(name))) blockers.push("Invalid incremental migration filename.");
const baselineCutoverVersion = ledger.migrations.at(-2).version;
if (baselineVersions.some((version) => version <= baselineCutoverVersion)) blockers.push("Baseline versions do not follow the historical ledger captured before incremental migrations.");
for (const name of incrementalFiles) {
  const version = name.slice(0, 14);
  const recorded = ledger.migrations.find((migration) => migration.version === version);
  if (recorded && recorded.name !== name.slice(15, -4)) blockers.push(`Incremental migration ${name} does not match its Production ledger record.`);
  if (!recorded && version <= ledger.migrations.at(-1).version) blockers.push(`Untracked migration ${name} is not newer than Production history.`);
}
if (new Set(baselineVersions).size !== baselineVersions.length) blockers.push("Duplicate baseline migration versions detected.");

// These two conditions require human-verified external evidence; code cannot infer them.
if (process.env.BETHAG_PRODUCTION_BACKUP_VERIFIED !== "YES") {
  blockers.push("No verified, restorable Production backup attestation (set BETHAG_PRODUCTION_BACKUP_VERIFIED=YES only after a restore test).");
}
if (process.env.BETHAG_LIVE_ACL_PARITY_VERIFIED !== "YES") {
  blockers.push("Live object-by-object ACL/ownership/default-privilege parity has not been attested.");
}
if (process.env.BETHAG_CUTOVER_PLAN_APPROVED !== "YES") {
  blockers.push("Migration-history cutover plan has not been explicitly approved.");
}
if (process.env.BETHAG_ENVIRONMENT_ALIGNMENT_VERIFIED !== "YES") {
  blockers.push("Production and QA do not yet have a signed-off canonical migration-ledger and live catalog alignment report.");
}
if (process.env.BETHAG_QA_EQUIVALENCE_VERIFIED !== "YES") {
  blockers.push("QA alternate migration SQL effects and QA-only test migrations have not been reconciled against the canonical migration sequence.");
}
if (process.env.BETHAG_ALL_ENVIRONMENT_LEDGERS_CAPTURED !== "YES") {
  blockers.push("Fresh live migration ledgers have not been captured for Production and all four Supabase QA/development branches.");
}

const report = {
  project_ref: ledger.project_ref,
  captured_production_migrations: ledger.count,
  baseline_migrations: baselineVersions,
  production_modified: false,
  ready_for_production_cutover: blockers.length === 0,
  blockers,
};
console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
