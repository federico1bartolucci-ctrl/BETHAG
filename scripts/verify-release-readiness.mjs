import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

// Fail-closed release gate for the clean BETHAG baseline.
// This script deliberately does not connect to or modify Production.
const ledger = JSON.parse(await readFile("supabase/rebuild/production-ledger-20261017.json", "utf8"));
const migrationFiles = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();
const baselineVersions = migrationFiles.map((name) => name.slice(0, 14));

const blockers = [];
if (ledger.count !== ledger.migrations.length) blockers.push("Captured Production migration ledger count is inconsistent.");
if (ledger.count !== 243) blockers.push("Captured Production migration ledger is stale; refresh it from the live project.");
if (migrationFiles.length !== 5) blockers.push("Expected exactly five clean baseline migrations.");
if (new Set(baselineVersions).size !== baselineVersions.length) blockers.push("Duplicate baseline migration versions detected.");
if (baselineVersions.some((version) => version <= ledger.migrations.at(-1).version)) {
  blockers.push("Baseline versions do not all follow the captured Production ledger.");
}

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
