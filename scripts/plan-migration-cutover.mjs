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
  const reverted = report.stale_qa_versions_to_mark_reverted.join(" ");
  const applied = report.canonical_versions_to_mark_applied.join(" ");
  console.log("\n# Run separately against each named QA project only, after confirming its live migration list.");
  console.log(`supabase migration repair --linked --status reverted ${reverted}`);
  console.log(`supabase migration repair --linked --status applied ${applied}`);
  console.log("supabase migration list --linked");
  console.log("# Never run these commands while linked to Production.");
}
