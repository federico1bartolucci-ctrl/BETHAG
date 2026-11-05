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
  readFile("supabase/rebuild/qa-ledger-20261105.json", "utf8").then(JSON.parse),
  readFile("supabase/rebuild/migration-history-reconciliation-20261026.json", "utf8").then(JSON.parse),
]);
assert.equal(production.project_ref, "tctcgptrsmvgajqjgnev", "Production project reference mismatch.");
assert.equal(qa.project_ref, "jhuyhlzzydcgghrzeexn", "Only the retained QA project may be an active QA target.");
assert.equal(production.count, production.migrations.length);
assert.equal(production.count, 244, "Refresh the Production ledger before planning cutover.");
assert.equal(production.migrations.at(-1).version, "20261022202747", "Refresh the Production head before planning cutover.");
assert.equal(qa.count, qa.migrations.length);
assert.equal(qa.count, 282, "Refresh the retained QA ledger before planning cutover.");
assert.deepEqual(qa.migrations.at(-1), { version: "20261104235514", name: "fix_portal_registration_upsert_conflict_target" });
assert.equal(reconciliation.production.ledger_count, production.count);
assert.equal(reconciliation.clean_baseline_branch.migration_files, 15, "The reconciliation artifact is a historical 15-file snapshot; newer reviewed remediation migrations are tracked separately.");
assert.equal(incrementalFiles.at(-1), "20261104235514_fix_portal_registration_upsert_conflict_target.sql", "Latest incremental migration must repair portal registration and administrator approval upserts.");

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
  active_qa_project_ref: qa.project_ref,
  active_qa_ledger_records: qa.count,
  active_qa_latest: qa.migrations.at(-1),
  canonical_baseline_files: baselineFiles,
  canonical_incremental_files: incrementalFiles,
  canonical_migration_file_count: canonical.length,
  canonical_files_matching_production_exactly: productionExact.map((file) => file.file),
  canonical_versions_already_registered_in_production: productionVersionOnly.map((file) => file.file),
  canonical_files_matching_active_qa_exactly: qaExact.map((file) => file.file),
  active_qa_entries_without_canonical_files_to_preserve: qaOnly.length,
  canonical_files_not_registered_in_active_qa: canonicalNotQa.map((file) => file.file),
  retired_qa_snapshots: "ARCHIVAL ONLY — not active targets and not used for this plan",
  production: "DO NOT MODIFY. The historical ledger is not equivalent to the clean baseline.",
  canonical_target_ledger: canonical.map(({ version, name }) => ({ version, name })),
  migration_ledger_alignment_plan: {
    production: {
      current_records: production.count,
      preserve_exact_canonical_head: production.migrations.at(-1),
      historical_rows_to_preserve_without_rewrite_or_deletion: production.count,
      baseline_tracking_rows_to_insert_into_existing_production: [],
      then_apply_only_reviewed_pending_incremental_migrations_in_order: canonical.filter((file) => file.version > production.migrations.at(-1).version).map(({ version, name }) => ({ version, name })),
      expected_record_count_if_all_pending_increments_are_approved_and_applied: production.count + canonical.filter((file) => file.version > production.migrations.at(-1).version).length,
      schema_or_data_recreated: false,
    },
    active_qa: {
      project_ref: qa.project_ref,
      current_records: qa.count,
      latest: qa.migrations.at(-1),
      preserve_all_existing_tracking_rows: true,
      preserve_environment_specific_entries_without_rewrite_or_deletion: true,
      canonical_files_not_registered: canonicalNotQa.map((file) => ({ version: file.version, name: file.name })),
      do_not_rewrite_or_delete_migration_ledger_rows: true,
    },
    rule: "Keep exactly one active QA project. Preserve its complete migration history and data. Never re-run baseline migrations, delete/rewrite historical rows, or mark an unverified effect applied. Production remains frozen until the separately approved cutover.",
  },
  next_gate: "Verified isolated backup restore of Production OR explicit named written acceptance of the documented physical-restore risk, fresh Production and active-QA ledger recapture, catalog/ACL parity, application acceptance, and approved cutover are prerequisites before any Production change.",
  ledger_safety: "Preserve all 244 historical Production rows and all 282 active-QA rows. Do not create another QA project or branch. Never rewrite migration history or apply Production SQL without explicit cutover approval.",
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
    "1. Confirm the exact Production and single retained QA project references.",
    "2. Keep all schema changes to QA on the existing project; do not create preview projects or branches.",
    "3. Capture both live ledgers immediately before any proposed change.",
    "4. Compare every proposed version and SQL body with the canonical source.",
    "5. Verify a recoverable Production backup by restoring it into an isolated target, or record explicit named written acceptance of the documented physical-restore risk.",
    "6. Obtain independent review of the exact Production migration-tracking plan.",
    "7. After any approved change, re-read the ledger and prove exact local/remote alignment.",
    "8. Stop if any target, source mapping, restore evidence, or catalog/ACL parity is uncertain.",
  ].join("\n"));
}
