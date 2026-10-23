import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";

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

// Explicitly list stale QA history; never derive QA repair commands from Production history.
const staleQaVersions = [
  "20260928021707", "20260928021808", "20260928021935", "20260928021944",
  "20260928022046", "20260928022126", "20260928022526", "20260928022821",
  "20260928024823", "20260928024931", "20260928040840", "20260928041428",
  "20260928042328", "20260928042333", "20260928043406", "20260928043415",
];
const generatedQaVersions = [
  "20261022205311", "20261022205314", "20261022205316", "20261022205325",
  "20261022205428", "20261022205431", "20261022205433", "20261022205518",
  "20261022205438", "20261022205441", "20261022205444", "20261022205446",
  "20261022205519", "20261022205451", "20261022205454", "20261022205457",
  "20261022205459", "20261022205521", "20261022205915", "20261022205917",
  "20261022205919", "20261022210623", "20261022210626", "20261022210628",
  "20261022210904", "20261022210908", "20261022210911",
];
const report = {
  scope: "QA ONLY",
  baseline_files: baselineFiles,
  canonical_incremental_files: incrementalFiles,
  canonical_versions_to_mark_applied: allVersions,
  stale_qa_versions_to_mark_reverted: [...new Set([...staleQaVersions, ...generatedQaVersions])].sort(),
  production: "DO NOT MODIFY; production ledger must never be used to generate QA repair commands",
  action: "PLAN_ONLY_REQUIRES_SUPABASE_CLI",
};
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--print-commands")) {
  console.error(
    "BLOCKED: generic --linked repair commands are unsafe. The target project must be explicitly verified, " +
    "and its live ledger must be captured before any repair. This planner intentionally does not emit executable commands."
  );
  process.exitCode = 2;
}

if (process.argv.includes("--print-review-checklist")) {
  console.log([
    "",
    "REVIEW CHECKLIST — NO COMMANDS EXECUTED",
    "1. Confirm the exact non-Production QA project reference in the Supabase dashboard.",
    "2. Verify the CLI is linked to that exact QA project; never use this plan while linked to Production.",
    "3. Fetch and save the live QA migration ledger immediately before any proposed repair.",
    "4. Compare each proposed version against actual migration files and QA-only history.",
    "5. Obtain independent review of the exact command list before running any migration repair.",
    "6. After repair, re-read the ledger and confirm exact local/remote alignment.",
    "7. Stop if the target reference or current ledger cannot be verified."
  ].join("\n"));
}
