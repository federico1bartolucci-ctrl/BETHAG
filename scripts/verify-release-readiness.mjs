import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const [production, qa, freeze, liveStatus] = await Promise.all([
  readFile(root + "/production-ledger-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/qa-ledger-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/live-environment-status-20261027.json", "utf8").then(JSON.parse),
]);
const files = (await readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort();
const versions = files.map(file => file.slice(0, 14));
const pending = freeze.sequence.map(item => ({
  version: item.file.slice(0, 14),
  name: item.file.slice(15, -4),
  file: item.file,
}));
const exact = (ledger, item) =>
  ledger.migrations.some(row => row.version === item.version && row.name === item.name);
const blockers = [];

function ageHours(timestamp) {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? (Date.now() - parsed) / 3_600_000 : Number.POSITIVE_INFINITY;
}
function snapshotTimestamp(value) {
  if (value.captured_at_utc) return value.captured_at_utc;
  if (value.captured_at) return value.captured_at + "T23:59:59Z";
  if (value.captured_date) return value.captured_date + "T23:59:59Z";
  return null;
}
function snapshotFresh(value, label, maxAgeHours = 24) {
  const captured = snapshotTimestamp(value);
  const age = captured ? ageHours(captured) : Number.POSITIVE_INFINITY;
  const fresh = age >= -1 && age <= maxAgeHours;
  if (!fresh) blockers.push(label + " snapshot is stale or has no valid capture timestamp; refresh it from the live environment.");
  return { captured_at: captured, age_hours: Number.isFinite(age) ? Math.round(age * 10) / 10 : null, fresh };
}

const productionSnapshot = snapshotFresh(production, "Production migration ledger");
const qaSnapshot = snapshotFresh(qa, "QA migration ledger");
const freezeSnapshot = snapshotFresh(freeze, "Production cutover freeze");
const environmentSnapshot = snapshotFresh(liveStatus, "Environment/backup status");

if (production.migrations.length !== production.count) {
  blockers.push("Production ledger snapshot count does not match its recorded migration array.");
}
if (qa.migrations.length !== qa.count) {
  blockers.push("QA ledger snapshot count does not match its recorded migration array.");
}
if (new Set(versions).size !== versions.length) {
  blockers.push("Canonical migration files contain duplicate version identifiers.");
}
if (pending.length !== freeze.sequence.length) {
  blockers.push("Frozen pending migration sequence is internally inconsistent.");
}
if (!pending.every(item => files.includes(item.file) && !exact(production, item))) {
  blockers.push("Canonical pending migration inventory differs from the frozen sequence or includes a migration already in the captured Production ledger.");
}
if (!freeze.live_ledger.forward_migrations_after_2026_11_02_freeze.every(item => exact(production, item))) {
  blockers.push("One or more Production-forward migrations are missing from the captured ledger.");
}
if (freeze.live_catalog.supabase_admin_default_maintain_entries !== 3) {
  blockers.push("Provider-managed supabase_admin default ACL inventory changed; refresh and review.");
}
if (qaSnapshot.fresh && qa.branch_status === "MIGRATIONS_FAILED") {
  blockers.push("The fresh QA ledger snapshot reports MIGRATIONS_FAILED; do not use QA as a release/cutover target.");
}
if (freeze.rehearsal_evidence.status !== "PASS" || !freeze.rehearsal_evidence.github_actions_run_id) {
  blockers.push("Ordered PostgreSQL 17 rehearsal of baseline + existing head + Production-forward migrations + pending increments has not passed.");
}
if (process.env.BETHAG_APP_01_15_ACCEPTANCE !== "YES") blockers.push("APP-01–APP-15 authenticated acceptance evidence is not recorded.");
if (process.env.BETHAG_LIVE_ACL_PARITY_VERIFIED !== "YES") blockers.push("Live object-by-object ACL/ownership/default-privilege parity has not been attested.");
if (process.env.BETHAG_CUTOVER_PLAN_APPROVED !== "YES") blockers.push("The migration tracking cutover plan has not been explicitly approved.");
if (process.env.BETHAG_QA_EQUIVALENCE_VERIFIED !== "YES") blockers.push("QA migration identities and SQL effects have not been fully reconciled.");
if (process.env.BETHAG_ALL_ENVIRONMENT_LEDGERS_CAPTURED !== "YES") blockers.push("Fresh ledgers for every QA/development environment have not been captured.");

const physicalRestoreVerified = process.env.BETHAG_PRODUCTION_BACKUP_VERIFIED === "YES";
const riskAcceptedBy = (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_BY ?? "").trim();
const riskAcceptedAt = (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_AT_UTC ?? "").trim();
const riskEvidence = (process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTANCE_EVIDENCE ?? "").trim();
const riskAccepted =
  riskAcceptedBy.length > 0 &&
  /^\\d{4}-\\d{2}-\\d{2}T.*Z$/.test(riskAcceptedAt) &&
  riskEvidence.length > 0;
if (!physicalRestoreVerified && !riskAccepted) {
  blockers.push("Provider physical restore is not evidenced and no named/timestamped/evidence-linked residual-risk acceptance is recorded.");
}
if (
  environmentSnapshot.fresh &&
  liveStatus.backup_restore_gate?.release_gate_passed !== true &&
  !physicalRestoreVerified &&
  !riskAccepted
) {
  blockers.push("The fresh provider restore gate remains blocked.");
}

const snapshotsFresh =
  productionSnapshot.fresh && qaSnapshot.fresh && freezeSnapshot.fresh && environmentSnapshot.fresh;
const report = {
  production: {
    project_ref: production.project_ref,
    snapshot_rows: production.count,
    snapshot_head: production.latest,
    snapshot_captured_at: productionSnapshot.captured_at,
    snapshot_fresh: productionSnapshot.fresh,
  },
  canonical_pending_increments: pending.length,
  expected_ledger_rows_after_tracking: snapshotsFresh ? production.count + pending.length : null,
  qa: {
    project_ref: qa.project_ref,
    snapshot_rows: qa.count,
    snapshot_head: qa.latest,
    snapshot_captured_at: qaSnapshot.captured_at,
    snapshot_branch_status: qa.branch_status,
    snapshot_fresh: qaSnapshot.fresh,
    current_live_branch_status: "NOT_ASSERTED_BY_SNAPSHOT_SCRIPT",
  },
  freeze_snapshot_fresh: freezeSnapshot.fresh,
  environment_snapshot_fresh: environmentSnapshot.fresh,
  recovered_historical_replayable_from_empty_database: false,
  historical_archive_action: "retain as immutable evidence; do not replay",
  physical_restore_verified: physicalRestoreVerified,
  physical_restore_risk_acceptance: riskAccepted
    ? { accepted_by: riskAcceptedBy, accepted_at_utc: riskAcceptedAt, evidence_reference: riskEvidence }
    : null,
  ready_for_production_cutover: blockers.length === 0,
  blockers: [...new Set(blockers)],
  production_or_qa_modified: false,
};
console.log(JSON.stringify(report, null, 2));
if (blockers.length) process.exitCode = 1;
