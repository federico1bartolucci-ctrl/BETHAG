import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const migrationDir = "supabase/migrations";
const [production, qa, mainInventory, reconciliation, liveStatus] = await Promise.all([
  readFile(`${root}/production-ledger-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/qa-ledger-20261105.json`, "utf8").then(JSON.parse),
  readFile(`${root}/main-migration-files-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/migration-history-reconciliation-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/live-environment-status-20261027.json`, "utf8").then(JSON.parse),
]);

const restoreGate = liveStatus.backup_restore_gate;
assert.ok(restoreGate, "Missing provider backup/restore release gate.");
assert.equal(restoreGate.source_project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(restoreGate.release_gate_passed, false, "Do not misrepresent the untested provider restore as successful.");
assert.equal(restoreGate.schema_acl_parity, "NOT VERIFIED", "Provider restore parity must be explicitly verified.");
assert.equal(restoreGate.target_project_ref, null, "Do not record a restore target before a real isolated restore exists.");
assert.equal(restoreGate.restore_completed_at_utc, null, "Do not record completion before a real isolated restore exists.");
assert.match(restoreGate.status, /BLOCKED/i, "Provider restore gate must remain blocked until evidenced.");

const files = (await readdir(migrationDir))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => ({ file, version: file.slice(0, 14), name: file.slice(15, -4) }));

const baselineNames = [
  "bethag_baseline_schema",
  "bethag_baseline_indexes_views",
  "bethag_baseline_functions",
  "bethag_baseline_security",
  "bethag_baseline_grants",
];
const expectedBaseline = baselineNames.map((name, i) => ({
  version: `2026101700000${i + 1}`,
  name,
}));
const productionHead = { version: "20261022202747", name: "harden_close_member_transfer_search_path" };
const expectedPending = [
  ["20261022210629", "restrict_private_function_public_execute"],
  ["20261022210630", "harden_default_privileges_and_private_execute"],
  ["20261022213544", "restrict_close_member_transfer_execute"],
  ["20261022233440", "align_public_function_execute"],
  ["20261023000001", "revoke_authenticated_maintain"],
  ["20261023000002", "revoke_default_maintain"],
  ["20261023000003", "revoke_service_role_maintain"],
  ["20261023000004", "application_default_table_privileges"],
  ["20261023000733", "use_invoker_for_close_transfer_rpc"],
  ["20261027100000", "revoke_public_execute_from_transfer_closure_helpers"],
  ["20261027110000", "repair_service_role_transfer_invoker_path"],
  ["20261028100000", "fix_collaborator_module_permission_boolean"],
  ["20261102100100", "add_workspace_member_profile_data"],
  ["20261102100200", "preserve_server_owned_condominium_archive_state"],
  ["20261104235514", "fix_portal_registration_upsert_conflict_target"],
].map(([version, name]) => ({ version, name }));

assert.equal(production.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(qa.project_ref, "jhuyhlzzydcgghrzeexn", "Only the retained QA project may be an active QA target.");
assert.equal(production.count, production.migrations.length);
assert.equal(qa.count, qa.migrations.length);
assert.equal(production.count, 244, "Refresh the Production ledger snapshot before planning a cutover.");
assert.equal(qa.count, 282, "Refresh the retained QA ledger snapshot before planning a cutover.");
assert.equal(qa.migrations.at(-1).version, "20261104235514", "The retained QA ledger must end at the portal registration repair.");
assert.equal(qa.migrations.at(-1).name, "fix_portal_registration_upsert_conflict_target");
assert.equal(mainInventory.count, mainInventory.files.length);
assert.equal(files.length, 21, "Canonical baseline + incremental migration inventory changed.");

assert.deepEqual(files.slice(0, 5).map(({ version, name }) => ({ version, name })), expectedBaseline);
assert.deepEqual(files.slice(5).map(({ version, name }) => ({ version, name })), [productionHead, ...expectedPending]);

const exact = (ledger, item) => ledger.migrations.some((entry) => entry.version === item.version && entry.name === item.name);
assert.ok(expectedBaseline.every((item) => exact(qa, item)), "The retained QA project must contain the canonical five-file baseline.");
assert.ok(exact(production, productionHead), "Production head migration differs from the captured canonical head.");
assert.ok(exact(qa, productionHead), "The retained QA project must contain the captured canonical head.");
assert.ok(expectedPending.every((item) => exact(qa, item)), "The retained QA project must contain every reviewed canonical increment.");

const productionPending = files
  .filter(({ version, name }) => !exact(production, { version, name }))
  .filter(({ version }) => version > productionHead.version);
assert.deepEqual(
  productionPending.map(({ version, name }) => ({ version, name })),
  expectedPending,
  "Production pending migration list differs from the approved canonical sequence.",
);

const qaVersions = qa.migrations.map(({ version }) => version);
assert.equal(new Set(qaVersions).size, qaVersions.length, "The retained QA ledger contains duplicate migration versions.");

const gates = {
  physical_restore_proof_or_risk_acceptance_recorded:
    process.env.BETHAG_BACKUP_RESTORE_VERIFIED === "YES" ||
    Boolean(
      (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_BY ?? "").trim() &&
      /^\\d{4}-\\d{2}-\\d{2}T.*Z$/.test((process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_AT_UTC ?? "").trim()) &&
      (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTANCE_EVIDENCE ?? "").trim()
    ),
  live_production_acl_parity_verified: process.env.BETHAG_LIVE_ACL_PARITY_VERIFIED === "YES",
  retained_qa_catalog_and_acl_parity_verified: process.env.BETHAG_LIVE_QA_PARITY_VERIFIED === "YES",
  production_and_retained_qa_ledgers_recaptured: process.env.BETHAG_PRODUCTION_AND_ACTIVE_QA_LEDGERS_CAPTURED === "YES",
  cutover_plan_approved: process.env.BETHAG_CUTOVER_APPROVED === "YES",
};
const blockers = Object.entries(gates).filter(([, passed]) => !passed).map(([gate]) => gate);

console.log(JSON.stringify({
  migration_alignment_inventory: "PASS",
  active_qa_project_ref: qa.project_ref,
  active_qa_ledger_records: qa.count,
  active_qa_ledger_head: qa.migrations.at(-1),
  retired_qa_snapshots: "ARCHIVAL ONLY — never used as active targets",
  canonical_baseline_migrations: expectedBaseline.length,
  canonical_incremental_migrations: expectedPending.length,
  production_ledger_records: production.count,
  production_pending_canonical_migrations: productionPending,
  active_qa_contains_all_canonical_migrations: true,
  original_main_inventory_files: mainInventory.count,
  original_main_exact_version_and_name_matches_production: reconciliation.repository_main.exact_version_and_name_matches,
  provider_restore_gate: restoreGate,
  note: "Only jhuyhlzzydcgghrzeexn is the active QA environment. Older QA project snapshots are retained for historical audit only. Production remains frozen until backup restore evidence or named risk acceptance, live ACL/catalog parity, final acceptance, and explicit cutover approval are complete.",
  cutover_ready: blockers.length === 0,
  blockers,
}, null, 2));
// A blocked release is an expected state during preflight. Exit non-zero only for inventory inconsistency.
