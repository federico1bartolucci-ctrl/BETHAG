import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const [production, qa, reconciliation, freeze] = await Promise.all([
  readFile(root + "/production-ledger-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/qa-ledger-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/migration-history-reconciliation-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261103.json", "utf8").then(JSON.parse),
]);

const migrationFiles = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((file) => ({ file, version: file.slice(0, 14), name: file.slice(15, -4) }));

const baselineFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const existingCanonicalHead = { version: "20261022202747", name: "harden_close_member_transfer_search_path" };
const expectedForward = [
  { version: "20261102151610", name: "harden_live_production_acl_and_transfer_invoker" },
  { version: "20261102200855", name: "restore_secure_communication_recipient_rpc_execute" },
  { version: "20261103070901", name: "grant_service_role_private_resend_event_rpc" },
];
const exact = (ledger, item) => ledger.migrations.some((row) => row.version === item.version && row.name === item.name);
const productionPairs = new Set(production.migrations.map((row) => row.version + "|" + row.name));

assert.equal(production.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(production.count, 247);
assert.equal(production.migrations.length, 247);
assert.deepEqual(production.latest, { version: "20261103070901", name: "grant_service_role_private_resend_event_rpc" });
assert.equal(qa.project_ref, "jhuyhlzzydcgghrzeexn");
assert.equal(qa.count, 47);
assert.equal(qa.branch_status, "MIGRATIONS_FAILED");
assert.equal(reconciliation.production.ledger_count, 247);
assert.equal(reconciliation.qa.ledger_count, 47);
assert.equal(freeze.live_ledger.rows, 247);
assert.equal(freeze.live_ledger.head_version, "20261103070901");
assert.equal(freeze.sequence.length, 14);
assert.equal(migrationFiles.length, 20);
assert.deepEqual(migrationFiles.slice(0, 5).map((row) => row.file), baselineFiles);
assert.ok(exact(production, existingCanonicalHead), "The prior canonical head must already be present in Production.");
assert.ok(expectedForward.every((row) => exact(production, row)), "All three later Production-forward migrations must be preserved exactly.");
assert.deepEqual(production.migrations.slice(-3), expectedForward, "Production's last three forward migrations differ from the captured approved evidence.");

const pending = freeze.sequence.map((item) => ({ version: item.file.slice(0, 14), name: item.file.slice(15, -4), file: item.file }));
assert.equal(pending.length, 14);
assert.ok(pending.every((row) => !productionPairs.has(row.version + "|" + row.name)), "A pending canonical migration already exists in Production; reconcile before cutover.");
assert.ok(pending.every((row) => migrationFiles.some((file) => file.file === row.file)), "A frozen canonical migration file is missing.");
assert.ok(baselineFiles.every((file) => !production.migrations.some((row) => row.version === file.slice(0, 14))), "Baseline versions must not be inserted into an existing Production ledger.");
assert.equal(freeze.expected_postflight.ledger_rows, 261);
assert.equal(freeze.expected_postflight.original_247_rows_unchanged, true);

const report = {
  scope: "READ-ONLY PLAN — no migration tracking or database changes",
  production: {
    project_ref: production.project_ref,
    historical_ledger_rows_to_preserve: production.count,
    current_sorted_head: production.latest,
    existing_canonical_head: existingCanonicalHead,
    later_forward_migrations_already_applied: expectedForward,
    canonical_baseline_files_not_to_insert: baselineFiles,
    pending_canonical_incrementals: pending,
    pending_count: pending.length,
    expected_ledger_rows_after_approved_tracking: 261,
    historical_rows_to_rewrite_or_delete: 0,
  },
  qa: {
    project_ref: qa.project_ref,
    ledger_rows: qa.count,
    latest: qa.latest,
    branch_status: qa.branch_status,
    action: "Do not use this branch as a cutover target until MIGRATIONS_FAILED is explained and its schema/data/ledger reconciled.",
  },
  forensic_history: {
    recovered_production_payloads: 247,
    archive_integrity: "247/247 payloads match database-derived MD5 and character-count manifest",
    clean_replay: "BLOCKED — first recorded migration requiring public.portal_access fails because no preceding ledger payload creates that live table",
    untracked_schema_evidence: "13 live public tables have no matching CREATE TABLE statement in the 247-row ledger; archived_at exists in Production but no ADD COLUMN is recorded",
    decision: "Do not replay the recovered 247 historical SQL files or rewrite Production history. Retain them as immutable evidence.",
  },
  live_security_posture: {
    authenticated_maintain_relations: 0,
    service_role_maintain_relations: 0,
    postgres_default_maintain_entries: 0,
    supabase_admin_default_maintain_entries: 3,
    public_execute_targets: freeze.live_catalog.public_execute_targets,
    transfer_wrapper_security_definer: false,
    service_role_private_schema_usage: true,
    service_role_private_transfer_execute: true,
    workspace_members_data_column_present: false,
    save_condominium_archive_state_preserved: false,
  },
  execution_plan: [
    "Refresh and compare all 247 Production version/name pairs immediately before any approved operation.",
    "Do not replay the 247 historical payloads and do not insert the five clean-baseline versions into existing Production.",
    "Preserve the three Production-forward migrations already applied after the prior freeze.",
    "Review the exact interaction of those three forward SQL payloads with the fourteen pending canonical increments; the ordered PostgreSQL 17 rehearsal must pass.",
    "Apply only the fourteen pending canonical increments through the guarded transactional runner, preserving all 247 original rows; versions may be older than the current sorted ledger head.",
    "Verify all postconditions and confirm the ledger contains 261 rows with the 247 historical pairs unchanged and the fourteen canonical pairs present.",
    "Resolve the three Supabase-managed supabase_admin default MAINTAIN entries with provider guidance or a named security-owner exception.",
    "Complete APP-01–APP-15 evidence and obtain written approval for the exact commit, migration hashes, maintenance window and rollback criteria.",
  ],
  gates: {
    production_backup_restore: "Provider-backed physical restore not performed; preserve the recorded local logical-restore evidence and explicit residual-risk disposition without claiming a provider restore.",
    supabase_admin_default_acl: "BLOCKED — three provider-managed default MAINTAIN entries remain.",
    qa_branch: "BLOCKED — current QA branch reports MIGRATIONS_FAILED.",
    app_acceptance: "APP-01–APP-15 not fully evidenced.",
    written_cutover_approval: "NOT RECORDED.",
  },
  action: "PLAN_ONLY_NO_COMMANDS",
};

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes("--print-commands")) {
  console.error(
    "BLOCKED: no generic migration-repair or production execution commands are emitted. " +
    "The recovered history is incomplete; use only the reviewed canonical runner after all release gates and written approval.",
  );
  process.exitCode = 2;
}

if (process.argv.includes("--print-review-checklist")) {
  console.log([
    "",
    "REVIEW CHECKLIST — NO COMMANDS EXECUTED",
    "1. Confirm the exact Production project reference and recapture all 247 ledger pairs.",
    "2. Confirm the three later Production-forward migration rows and their SQL hashes.",
    "3. Confirm all fourteen canonical versions are absent and all five baseline versions remain excluded.",
    "4. Complete the ordered PostgreSQL 17 rehearsal against baseline + existing head + three Production forwards + fourteen canonical increments.",
    "5. Verify the 261-row final ledger set and unchanged 247 historical pairs.",
    "6. Obtain provider guidance or named security-owner disposition for supabase_admin default ACL MAINTAIN.",
    "7. Complete APP-01–APP-15 and confirm the QA MIGRATIONS_FAILED condition is resolved.",
    "8. Obtain written approval naming the exact commit, SQL hashes, maintenance window and rollback criteria.",
    "9. Stop if any live ledger, catalog, ACL, backup or source mapping differs from the frozen evidence.",
  ].join("\n"));
}
