import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const report = JSON.parse(await readFile("supabase/rebuild/live-migration-ledger-reconciliation-20261027.json", "utf8"));
const activeQa = JSON.parse(await readFile("supabase/rebuild/qa-ledger-20261105.json", "utf8"));
const files = (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql")).sort();

assert.equal(report.production_unchanged, true, "The captured historical report must not imply Production was modified.");
assert.equal(report.canonical_branch_inventory.length, 16, "Historical canonical branch inventory changed.");
assert.equal(files.length, 21, "Expected the canonical baseline and reviewed incremental migration inventory.");
assert.equal(activeQa.project_ref, "jhuyhlzzydcgghrzeexn", "Only the retained QA project may be an active QA target.");
assert.equal(activeQa.count, activeQa.migrations.length);
assert.equal(activeQa.count, 282, "Refresh the active QA ledger snapshot when live migration history changes.");
assert.deepEqual(activeQa.migrations.at(-1), {
  version: "20261104235514",
  name: "fix_portal_registration_upsert_conflict_target",
});

for (const file of [
  "20261027110000_repair_service_role_transfer_invoker_path.sql",
  "20261102100100_add_workspace_member_profile_data.sql",
  "20261102100200_preserve_server_owned_condominium_archive_state.sql",
  "20261104235514_fix_portal_registration_upsert_conflict_target.sql",
]) {
  assert.ok(files.includes(file), "Missing canonical forward migration: " + file);
}

const historicalEnvironmentNames = report.environments.map((entry) => entry.name);
assert.ok(historicalEnvironmentNames.includes("production"), "Historical report must retain its Production evidence.");
assert.ok(historicalEnvironmentNames.length >= 1, "Historical environment report is empty.");

console.log(JSON.stringify({
  status: "PASS — active single-QA ledger and canonical migration inventory are consistent",
  active_qa: {
    project_ref: activeQa.project_ref,
    ledger_count: activeQa.count,
    ledger_head: activeQa.migrations.at(-1),
  },
  retired_qa_snapshots: {
    disposition: "ARCHIVAL_ONLY_NOT_ACTIVE_TARGETS",
    historical_environment_records: historicalEnvironmentNames.filter((name) => name !== "production").length,
  },
  production: {
    historical_ledger_unchanged_in_capture: report.production_unchanged,
    no_live_production_mutation_performed: true,
  },
}, null, 2));
