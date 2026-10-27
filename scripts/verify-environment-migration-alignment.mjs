import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const migrationDir = "supabase/migrations";
const [production, qa, mainInventory, reconciliation, liveStatus, liveQaExecuteHardening] = await Promise.all([
  readFile(`${root}/production-ledger-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/qa-ledger-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/main-migration-files-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/migration-history-reconciliation-20261026.json`, "utf8").then(JSON.parse),
  readFile(`${root}/live-environment-status-20261027.json`, "utf8").then(JSON.parse),
  readFile(`${root}/live-qa-execute-hardening-20261027.json`, "utf8").then(JSON.parse),
]);

const restoreGate = liveStatus.backup_restore_gate;
assert.ok(restoreGate, "Missing provider backup/restore release gate.");
assert.equal(restoreGate.source_project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(restoreGate.release_gate_passed, false, "Do not misrepresent the untested provider restore as successful.");
assert.equal(restoreGate.schema_acl_parity, "NOT VERIFIED", "Provider restore parity must be explicitly verified.");
assert.equal(restoreGate.target_project_ref, null, "Do not record a restore target before a real isolated restore exists.");
assert.equal(restoreGate.restore_completed_at_utc, null, "Do not record completion before provider restore evidence exists.");
assert.match(restoreGate.status, /BLOCKED/i, "Provider restore gate must remain blocked until evidenced.");

const environments = [
  ...liveStatus.environments.map((environment) => ({ name: environment.name, project_ref: environment.project_ref, ledger_count: environment.ledger_count, ledger_head: environment.ledger_head, rebase_status: environment.rebase_status_at_capture ?? "not-applicable" })),
];

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
].map(([version, name]) => ({ version, name }));

assert.equal(production.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(qa.project_ref, "mxhciszzpqzvsaqcnwhg");
assert.equal(production.count, production.migrations.length);
assert.equal(qa.count, qa.migrations.length);
assert.equal(production.count, 244, "Refresh the Production ledger snapshot before planning a cutover.");
assert.equal(qa.count, 17, "Refresh the QA ledger snapshot before planning a cutover.");
assert.equal(mainInventory.count, mainInventory.files.length);
assert.equal(files.length, 16, "Canonical baseline + incremental migration inventory changed.");
assert.equal(liveQaExecuteHardening.production_modified, false, "QA ACL hardening evidence must not claim Production was modified.");
assert.equal(liveQaExecuteHardening.qa_post_migration_acl_check.projects_checked, 4);
assert.equal(liveQaExecuteHardening.qa_post_migration_acl_check.helper_functions_public_execute, false);
assert.equal(liveQaExecuteHardening.qa_post_migration_acl_check.helper_functions_authenticated_execute, true);
assert.equal(liveQaExecuteHardening.qa_post_migration_acl_check.helper_functions_service_role_execute, true);
assert.equal(liveQaExecuteHardening.qa_environments.length, 4);
assert.ok(liveQaExecuteHardening.qa_environments.every((environment) => environment.security_advisor_lints === 0), "All four QA/development environments must have zero security advisor lints after helper ACL hardening.");
assert.deepEqual(files.slice(0, 5).map(({ version, name }) => ({ version, name })), expectedBaseline);
assert.deepEqual(files.slice(5).map(({ version, name }) => ({ version, name })), [productionHead, ...expectedPending]);

const exact = (ledger, item) => ledger.migrations.some((entry) => entry.version === item.version && entry.name === item.name);
assert.ok(expectedBaseline.every((item) => exact(qa, item)), "QA baseline adoption is not present in the captured ledger.");
assert.ok(exact(production, productionHead), "Production head migration differs from the captured canonical head.");
assert.ok(exact(qa, productionHead), "QA head migration differs from the captured canonical head.");

const productionPending = files
  .filter(({ version, name }) => !exact(production, { version, name }))
  .filter(({ version }) => version > productionHead.version);
assert.deepEqual(
  productionPending.map(({ version, name }) => ({ version, name })),
  expectedPending,
  "Production pending migration list differs from the approved canonical sequence.",
);

const qaEquivalentCandidates = [
  { canonical: "20261023000001_revoke_authenticated_maintain", observed: "20261022230901_revoke_authenticated_maintain" },
  { canonical: "20261023000002_revoke_default_maintain", observed: "20261022230908_revoke_default_maintain" },
  { canonical: "20261023000003_revoke_service_role_maintain", observed: "20261023011431_revoke_service_role_maintain_qa_test" },
  { canonical: "20261023000004_application_default_table_privileges", observed: "20261023011435_define_application_default_table_privileges_qa" },
];
for (const mapping of qaEquivalentCandidates) {
  const [canonicalVersion, canonicalName] = [mapping.canonical.slice(0, 14), mapping.canonical.slice(15)];
  const [observedVersion, observedName] = [mapping.observed.slice(0, 14), mapping.observed.slice(15)];
  assert.ok(files.some((file) => file.version === canonicalVersion && file.name === canonicalName), `Missing canonical migration: ${mapping.canonical}`);
  assert.ok(qa.migrations.some((entry) => entry.version === observedVersion && entry.name === observedName), `QA ledger snapshot changed: ${mapping.observed}`);
}
const qaOnlyTestMigrations = [
  { version: "20261023010544", name: "qa_test_revoke_authenticated_maintain_20261023" },
  { version: "20261023010548", name: "qa_test_revoke_default_maintain_20261023" },
];
assert.ok(qaOnlyTestMigrations.every((item) => exact(qa, item)), "QA-only test migration ledger changed.");

const gates = {
  physical_restore_proof_or_risk_acceptance_recorded:
    process.env.BETHAG_BACKUP_RESTORE_VERIFIED === "YES" ||
    Boolean(
      (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_BY ?? "").trim() &&
      /^\d{4}-\d{2}-\d{2}T.*Z$/.test((process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_AT_UTC ?? "").trim()) &&
      (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTANCE_EVIDENCE ?? "").trim()
    ),
  live_production_and_qa_acl_parity_verified: process.env.BETHAG_LIVE_ACL_PARITY_VERIFIED === "YES",
  qa_variant_sql_equivalence_verified: process.env.BETHAG_QA_EQUIVALENCE_VERIFIED === "YES",
  all_five_environment_ledgers_recaptured: process.env.BETHAG_ALL_ENVIRONMENT_LEDGERS_CAPTURED === "YES",
  cutover_plan_approved: process.env.BETHAG_CUTOVER_APPROVED === "YES",
};
const blockers = Object.entries(gates).filter(([, passed]) => !passed).map(([gate]) => gate);

console.log(JSON.stringify({
  migration_alignment_inventory: "PASS",
  environments,
  environments_without_captured_ledger: liveStatus.environments.filter((environment) => !environment.ledger_count || !environment.ledger_head).map((environment) => environment.name),
  environments_requiring_reaudit_after_rebase: liveStatus.environments.filter((environment) => environment.rebase_requested).map((environment) => environment.name),
  canonical_baseline_migrations: expectedBaseline.length,
  canonical_incremental_migrations: expectedPending.length + 1,
  production_ledger_records: production.count,
  production_pending_canonical_migrations: productionPending,
  qa_ledger_records: qa.count,
  qa_equivalent_migrations_requiring_SQL_proof: qaEquivalentCandidates,
  qa_only_test_migrations_requiring_disposition: qaOnlyTestMigrations,
  live_environment_status_captured_at_utc: liveStatus.captured_at_utc,
  live_qa_execute_hardening: liveQaExecuteHardening,
  live_environment_evidence: liveStatus.environments.map((environment) => ({
    name: environment.name,
    ledger_count: environment.ledger_count,
    ledger_head: environment.ledger_head,
    schema: environment.schema,
    acl: environment.acl,
    default_acl_maintain: environment.default_acl_maintain,
    close_transfer_security_definer: environment.close_transfer_security_definer,
    application_row_counts: environment.application_row_counts,
    catalog_fingerprints: environment.catalog_fingerprints,
    rebase_status: environment.rebase_status_at_capture ?? "not-applicable",
  })),
  original_main_inventory_files: mainInventory.count,
  original_main_exact_version_and_name_matches_production: reconciliation.repository_main.exact_version_and_name_matches,
  production_live_security_drift: (() => { const production = liveStatus.environments.find((environment) => environment.name === "production"); return { current_table_maintain: production.acl, default_acl_maintain: production.default_acl_maintain, close_transfer_security_definer: production.close_transfer_security_definer, application_row_counts: production.application_row_counts }; })(),
  note: "The live status file is a dated evidence snapshot, not a live query. bethag-develop recovery is complete at the captured 15-entry canonical ledger and healthy branch status. Production remains blocked by current/default MAINTAIN grants, SECURITY DEFINER, unresolved QA alias SQL semantics, backup-restore evidence, and approval. Do not rewrite Production migration history or apply Production SQL until all gates are independently evidenced.",
  cutover_ready: blockers.length === 0,
  blockers,
}, null, 2));
// A blocked release is an expected state during preflight. Exit non-zero only for inventory inconsistency;\n// release automation must consume cutover_ready and require explicit attestations separately.
