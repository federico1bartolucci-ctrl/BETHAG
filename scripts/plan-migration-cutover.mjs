import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const migrationsDirectory = "supabase/migrations";
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const expectedBaselineFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const baselineFiles = migrationFiles.filter((name) => expectedBaselineFiles.includes(name));
assert.deepEqual(baselineFiles, expectedBaselineFiles, "Expected the five ordered baseline migrations.");
const parseVersion = (name) => {
  const match = /^(\d{14})_[a-z0-9][a-z0-9_-]*\.sql$/.exec(name);
  assert.ok(match, `Invalid migration filename: ${name}`);
  return match[1];
};
const allVersions = migrationFiles.map(parseVersion);
assert.equal(new Set(allVersions).size, allVersions.length, "Duplicate migration version.");
const baselineVersions = baselineFiles.map(parseVersion);
const incrementalFiles = migrationFiles.filter((name) => !expectedBaselineFiles.includes(name));
assert.ok(incrementalFiles.every((name) => parseVersion(name) > baselineVersions.at(-1)), "Incremental migrations must follow the baseline.");

const [production, qa, reconciliation] = await Promise.all([
  readFile("supabase/rebuild/production-ledger-20261026.json", "utf8").then(JSON.parse),
  readFile("supabase/rebuild/qa-ledger-20261026.json", "utf8").then(JSON.parse),
  readFile("supabase/rebuild/migration-history-reconciliation-20261026.json", "utf8").then(JSON.parse),
]);
assert.equal(production.project_ref, "tctcgptrsmvgajqjgnev", "Production project reference mismatch.");
assert.equal(qa.project_ref, "mxhciszzpqzvsaqcnwhg", "QA project reference mismatch.");
assert.equal(production.count, production.migrations.length);
assert.equal(qa.count, qa.migrations.length);
assert.equal(reconciliation.production.ledger_count, production.count);
assert.equal(reconciliation.qa.ledger_count, qa.count);
assert.equal(reconciliation.clean_baseline_branch.migration_files, migrationFiles.length);

const canonical = migrationFiles.map((file) => ({ file, version: parseVersion(file), name: file.slice(15, -4) }));
const productionExact = canonical.filter((file) => production.migrations.some((m) => m.version === file.version && m.name === file.name));
const productionVersionOnly = canonical.filter((file) => production.migrations.some((m) => m.version === file.version));
const qaExact = canonical.filter((file) => qa.migrations.some((m) => m.version === file.version && m.name === file.name));
const qaOnly = qa.migrations.filter((m) => !canonical.some((file) => file.version === m.version && file.name === m.name));
const canonicalNotQa = canonical.filter((file) => !qa.migrations.some((m) => m.version === file.version && m.name === file.name));

const report = {
  scope: "READ-ONLY PLAN — no migration tracking or database changes",
  production_project_ref: production.project_ref,
  production_ledger_records: production.count,
  production_latest: production.migrations.at(-1),
  qa_project_ref: qa.project_ref,
  qa_ledger_records: qa.count,
  qa_latest: qa.migrations.at(-1),
  canonical_baseline_files: baselineFiles,
  canonical_incremental_files: incrementalFiles,
  canonical_migration_file_count: canonical.length,
  clean_branch_exact_version_and_name_matches_production: productionExact.map((file) => file.file),
  clean_branch_versions_already_registered_in_production: productionVersionOnly.map((file) => file.file),
  clean_branch_exact_version_and_name_matches_qa: qaExact.map((file) => file.file),
  qa_ledger_entries_without_exact_canonical_file: qaOnly,
  canonical_files_not_registered_in_qa: canonicalNotQa.map((file) => file.file),
  production: "DO NOT MODIFY. The historical ledger is not equivalent to the clean baseline.",
  next_gate: "Verified isolated backup restore and approved catalog/ACL parity are prerequisites before any Production tracking cutover.",
  action: "PLAN_ONLY_NO_COMMANDS",
};
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--print-commands")) {
  console.error(
    "BLOCKED: generic linked migration-repair commands are unsafe. " +
    "The planner intentionally emits no executable repair commands. Verify the exact target, capture its live ledger, " +
    "complete the restore drill, and obtain independent review before any ledger change.",
  );
  process.exitCode = 2;
}

if (process.argv.includes("--print-review-checklist")) {
  console.log([
    "",
    "REVIEW CHECKLIST — NO COMMANDS EXECUTED",
    "1. Confirm the exact target project reference in Supabase.",
    "2. Never run a repair while the CLI may be linked to Production unless the approved cutover explicitly requires it.",
    "3. Capture the target's live migration ledger immediately before any proposed repair.",
    "4. Compare every proposed version and SQL body with the canonical source and identify QA-only tests.",
    "5. Verify a recoverable Production backup by restoring it into a separately identified isolated target.",
    "6. Obtain independent review of the exact project-specific migration-tracking plan.",
    "7. After any approved repair, re-read the ledger and prove exact local/remote alignment.",
    "8. Stop if any target, source mapping, restore evidence, or catalog/ACL parity is uncertain.",
  ].join("\n"));
}
