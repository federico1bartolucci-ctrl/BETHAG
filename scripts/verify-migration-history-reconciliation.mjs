import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const productionPath = "supabase/rebuild/production-ledger-20261026.json";
const qaPath = "supabase/rebuild/qa-ledger-20261026.json";
const mainPath = "supabase/rebuild/main-migration-files-20261026.json";
const reportPath = "supabase/rebuild/migration-history-reconciliation-20261026.json";

const [production, qa, main, savedReport] = await Promise.all([
  readFile(productionPath, "utf8").then(JSON.parse),
  readFile(qaPath, "utf8").then(JSON.parse),
  readFile(mainPath, "utf8").then(JSON.parse),
  readFile(reportPath, "utf8").then(JSON.parse),
]);
const currentFiles = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .map((file) => ({ file, version: file.slice(0, 14), name: file.slice(15, -4) }))
  .sort((a, b) => a.version.localeCompare(b.version));

assert.equal(production.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(qa.project_ref, "mxhciszzpqzvsaqcnwhg");
assert.equal(production.count, production.migrations.length);
assert.equal(qa.count, qa.migrations.length);
assert.equal(main.count, main.files.length);
assert.equal(production.count, 244, "Refresh Production ledger snapshot when live migration history changes.");
assert.equal(qa.count, 17, "Refresh QA ledger snapshot when live migration history changes.");
assert.equal(main.count, 203, "Refresh main migration-file inventory when main changes.");
assert.equal(currentFiles.length, 15, "Clean branch migration inventory changed; refresh reconciliation report.");
for (const list of [production.migrations, qa.migrations]) {
  const versions = list.map((entry) => entry.version);
  assert.ok(versions.every((version) => /^\d{14}$/.test(version)));
  assert.equal(new Set(versions).size, versions.length, "Duplicate migration version in captured ledger.");
  assert.deepEqual(versions, [...versions].sort(), "Captured ledger is not ordered by version.");
}
for (const file of [...main.files, ...currentFiles]) {
  assert.match(file.file, /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/);
  assert.equal(file.version, file.file.slice(0, 14));
}

const classify = [];
for (const migration of production.migrations) {
  const sameVersion = main.files.find((file) => file.version === migration.version);
  if (sameVersion && sameVersion.name === migration.name) {
    classify.push({ classification: "exact_version_and_name", productionVersion: migration.version, productionName: migration.name, repositoryFile: sameVersion.file });
  } else if (sameVersion) {
    classify.push({ classification: "same_version_different_name", productionVersion: migration.version, productionName: migration.name, repositoryFile: sameVersion.file, repositoryName: sameVersion.name });
  } else {
    const sameName = main.files.filter((file) => file.name === migration.name);
    if (sameName.length) {
      classify.push({ classification: "same_name_different_version", productionVersion: migration.version, productionName: migration.name, repositoryFiles: sameName.map((file) => file.file) });
    } else {
      classify.push({ classification: "no_matching_source_file", productionVersion: migration.version, productionName: migration.name });
    }
  }
}
const exact = classify.filter((item) => item.classification === "exact_version_and_name");
const sameName = classify.filter((item) => item.classification === "same_name_different_version");
const noSource = classify.filter((item) => item.classification === "no_matching_source_file");
const productionVersions = new Set(production.migrations.map((item) => item.version));
const qaVersions = new Set(qa.migrations.map((item) => item.version));
const productionMatches = currentFiles
  .filter((file) => productionVersions.has(file.version))
  .map((file) => ({ file: file.file, version: file.version, productionName: production.migrations.find((item) => item.version === file.version).name }));
const notInProduction = currentFiles
  .filter((file) => !productionVersions.has(file.version))
  .map((file) => ({ file: file.file, version: file.version, name: file.name }));
const qaMatches = currentFiles
  .filter((file) => qa.migrations.some((item) => item.version === file.version && item.name === file.name))
  .map((file) => ({ file: file.file, version: file.version, name: file.name }));
const qaOnly = qa.migrations.filter((item) => !currentFiles.some((file) => file.version === item.version && file.name === item.name));
const cleanOnly = currentFiles
  .filter((file) => !qa.migrations.some((item) => item.version === file.version && item.name === file.name))
  .map((file) => ({ file: file.file, version: file.version, name: file.name }));

const calculated = {
  captured_at_utc: "2026-10-26",
  scope: "Read-only migration history reconciliation inventory; no schema, data, or remote migration ledger was changed.",
  production: { project_ref: production.project_ref, ledger_count: production.count, latest: production.migrations.at(-1) },
  qa: { project_ref: qa.project_ref, ledger_count: qa.count, latest: qa.migrations.at(-1) },
  repository_main: {
    migration_files: main.count,
    exact_version_and_name_matches: exact.length,
    same_name_but_different_version: sameName.length,
    no_matching_source_file: noSource.length,
    same_version_different_name: classify.filter((item) => item.classification === "same_version_different_name").length,
  },
  production_to_main: { exact_version_and_name_matches: exact, same_name_but_different_version: sameName, no_matching_source_file: noSource },
  clean_baseline_branch: {
    branch: "rebuild/bethag-clean-aligned-20261022",
    migration_files: currentFiles.length,
    production_version_matches: productionMatches,
    files_not_registered_in_production: notInProduction,
    qa_exact_version_and_name_matches: qaMatches,
    qa_entries_not_in_clean_branch: qaOnly,
    clean_files_not_in_qa: cleanOnly,
  },
  cutover_status: {
    production_ledger_modified: false,
    qa_ledger_modified: false,
    production_schema_or_data_modified: false,
    ready_for_production_tracking_cutover: false,
    reason: "The production ledger's 243 historical rows do not have matching individual source files in the clean baseline branch; the clean branch replaces history with a 5-file baseline plus incremental migrations. Migration tracking must not be repaired until a verified restore point and catalog/ACL sign-off exist.",
  },
};
assert.deepEqual(savedReport, calculated, "The reconciliation report is stale or does not match the captured ledgers and repository inventories.");

console.log(JSON.stringify({
  migration_history_reconciliation: "PASS — inventory and mapping artifact are internally consistent",
  production_ledger_rows: production.count,
  qa_ledger_rows: qa.count,
  main_migration_files: main.count,
  clean_branch_migration_files: currentFiles.length,
  production_to_main: { exact_version_and_name: exact.length, same_name_different_version: sameName.length, no_matching_source_file: noSource.length },
  clean_branch_to_production: { exact_version_matches: productionMatches.length, not_registered_in_production: notInProduction.length },
  clean_branch_to_qa: { exact_version_and_name_matches: qaMatches.length, qa_entries_not_in_clean_branch: qaOnly.length, clean_files_not_in_qa: cleanOnly.length },
  production_tracking_cutover: "BLOCKED — verified restore point and semantic catalog/ACL sign-off required",
}, null, 2));
