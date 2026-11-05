#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const [production, qa, freeze, liveStatus, appEvidence] = await Promise.all([
  readFile(root + "/production-ledger-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/qa-ledger-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/live-environment-status-20261027.json", "utf8").then(JSON.parse),
  readFile(root + "/qa-final-collaudo-20261105.json", "utf8").then(JSON.parse),
]);

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes])).digest("hex");
}

const migrationDirectory = "supabase/migrations";
const files = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
const pending = freeze.sequence.map((item) => item.file);
const expectedFiles = [
  ...freeze.clean_install.baseline_files,
  freeze.clean_install.existing_canonical_head,
  ...freeze.clean_install.pending_canonical_increments,
  ...freeze.clean_install.exact_production_forward_files,
].sort();
const preCutoverBlockers = [];
const postCutoverBlockers = [];

assert.equal(production.count, 248, "Production snapshot must contain the exact 248-row live ledger.");
assert.equal(production.migrations.length, 248);
assert.equal(qa.count, 283, "The sole existing QA snapshot must contain 283 rows.");
assert.equal(qa.migrations.length, 283);
assert.equal(files.length, 28, "The deployable clean-install chain must contain 28 reviewed SQL files.");
assert.deepEqual(files, expectedFiles, "Deployable migration directory differs from the frozen 28-file set.");
assert.deepEqual(freeze.clean_install.pending_canonical_increments, pending, "Frozen runner sequence differs from the clean-install inventory.");
assert.equal(freeze.sequence.length, 19, "The Production cutover must contain nineteen canonical increments.");
assert.equal(freeze.clean_install.migration_file_count, 28);
assert.equal(freeze.expected_postflight.ledger_rows, 267);
assert.equal(freeze.live_ledger.historical_rows_to_preserve, 248);
assert.equal(freeze.live_ledger.baseline_rows_to_insert, 0);
assert.equal(freeze.live_ledger.delete_or_rewrite_historical_rows, false);

for (const item of freeze.sequence) {
  const sql = await readFile(migrationDirectory + "/" + item.file, "utf8");
  assert.equal(gitBlobSha(sql), item.git_blob_sha, "Reviewed SQL hash mismatch: " + item.file);
}
for (const item of freeze.live_ledger.forward_migrations_after_2026_11_02_freeze) {
  const sql = await readFile(migrationDirectory + "/" + item.file, "utf8");
  assert.equal(gitBlobSha(sql), item.git_blob_sha, "Production-forward SQL hash mismatch: " + item.file);
}

if (freeze.rehearsal_evidence.status !== "PASS" || freeze.rehearsal_evidence.github_actions_run_id !== 42017349811) {
  preCutoverBlockers.push("The exact 248-row + 19-increment PostgreSQL 17 rehearsal is not evidenced as PASS.");
}
if (appEvidence.workflow_runs.final_qa_collaudo.conclusion !== "success") {
  preCutoverBlockers.push("Final authenticated QA collaudo did not complete successfully.");
}
if (appEvidence.application_tests.APP12.status !== "PASS" || appEvidence.application_tests.APP12.provider_delivery !== "PASS") {
  preCutoverBlockers.push("APP-12 provider delivery remains PARTIAL: configure QA RESEND_API_KEY/BETHAG_FROM_EMAIL and verify delivery.");
}
if (process.env.BETHAG_QA_APP_ACCEPTANCE_COMPLETE !== "YES") {
  preCutoverBlockers.push("QA application acceptance has not been explicitly attested complete.");
}
if (process.env.BETHAG_PRODUCTION_DATA_API_EXPOSURE_VERIFIED !== "YES") {
  preCutoverBlockers.push("Production Data API exposure for provider-managed schema supabase_functions has not been verified in Dashboard.");
}
const physicalRestoreVerified = process.env.BETHAG_PRODUCTION_BACKUP_VERIFIED === "YES";
const riskRecord = freeze.backup_restore_risk_acceptance;
const riskAccepted = riskRecord?.accepted === true
  && Boolean(riskRecord.accepted_by)
  && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(riskRecord.accepted_at_utc ?? "")
  && Boolean(riskRecord.evidence_reference);
if (!physicalRestoreVerified && !riskAccepted) {
  preCutoverBlockers.push("Provider-managed physical restore is unverified and the frozen manifest does not contain a named/timestamped residual-risk acceptance; the paid Restore to a New Project route remains excluded.");
}
if (!process.env.DATABASE_URL) preCutoverBlockers.push("Direct PostgreSQL DATABASE_URL with DDL privileges is not available to the guarded runner.");
if (process.env.BETHAG_CUTOVER_PLAN_APPROVED !== "YES") {
  preCutoverBlockers.push("The exact cutover plan, maintenance window, communication plan and rollback procedure are not approved.");
}
if (freeze.user_authorization?.status !== "RECEIVED") preCutoverBlockers.push("Explicit user authorization for release operations is not recorded.");
if (appEvidence.application_tests.APP14.status !== "PASS") {
  postCutoverBlockers.push("APP-14 Production ACL/schema/Data API postflight must pass after the guarded cutover.");
}

const report = {
  production_project_ref: freeze.production_project_ref,
  production_ledger_rows: production.count,
  production_ledger_head: freeze.live_ledger.head_version + "_" + freeze.live_ledger.head_name,
  qa_project_ref: qa.project_ref,
  qa_ledger_rows: qa.count,
  clean_install_migration_files: files.length,
  pending_canonical_increments: pending.length,
  expected_postflight_ledger_rows: freeze.expected_postflight.ledger_rows,
  isolated_postgres_rehearsal: {
    status: freeze.rehearsal_evidence.status,
    run_id: freeze.rehearsal_evidence.github_actions_run_id,
    head_sha: freeze.rehearsal_evidence.github_actions_head_sha,
  },
  final_qa_run_id: appEvidence.workflow_runs.final_qa_collaudo.run_id,
  app_statuses: appEvidence.application_tests,
  backup_restore: {
    provider_physical_restore_verified: physicalRestoreVerified,
    residual_risk_accepted: riskAccepted,
    paid_restore_to_new_project_authorized: false,
  },
  user_release_authorization_received: freeze.user_authorization?.status === "RECEIVED",
  ready_for_production_cutover: preCutoverBlockers.length === 0,
  ready_for_production_release: preCutoverBlockers.length === 0 && postCutoverBlockers.length === 0,
  pre_cutover_blockers: [...new Set(preCutoverBlockers)],
  post_cutover_blockers: [...new Set(postCutoverBlockers)],
  production_or_qa_modified_by_this_check: false,
};
console.log(JSON.stringify(report, null, 2));
if (preCutoverBlockers.length || postCutoverBlockers.length) process.exitCode = 1;
