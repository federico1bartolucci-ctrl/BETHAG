#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gitBlobSha, hasPostgresConnectionConfig, splitChangedPaths, getApplicationTest, isFreshSnapshot, frozenManifestPayload } from "./lib/release-readiness-utils.mjs";

const root = "supabase/rebuild";
const [production, liveLedgers, freeze, appEvidence] = await Promise.all([
  readFile(root + "/production-ledger-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/live-migration-ledgers-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/qa-final-collaudo-20261105.json", "utf8").then(JSON.parse),
]);
const qa = liveLedgers.qa;


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
const checkedOutHeadSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const expectedHeadSha = process.env.BETHAG_EXPECTED_COMMIT_SHA?.trim() || "";
const testedQaSha = process.env.BETHAG_QA_TESTED_COMMIT_SHA?.trim() || "";

assert.ok(isFreshSnapshot(production.captured_at_utc),
  "Production ledger snapshot is stale or lacks a valid UTC capture timestamp; refresh it read-only.");
assert.ok(isFreshSnapshot(qa.captured_at_utc),
  "QA ledger snapshot is stale or lacks a valid UTC capture timestamp; refresh it read-only.");
assert.equal(production.count, 248, "Production snapshot must contain the exact 248-row live ledger.");
assert.equal(production.migrations.length, 248);
assert.equal(qa.count, 283, "The sole existing QA snapshot must contain 283 rows.");
assert.equal(qa.migrations.length, 283);
assert.equal(liveLedgers.production.count, production.count,
  "Combined live ledger capture and Production snapshot row counts disagree.");
assert.deepEqual(liveLedgers.production.migrations, production.migrations,
  "Combined live ledger capture and Production snapshot contents disagree.");
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

const buildEvidence = appEvidence.workflow_runs?.build;
if (buildEvidence?.conclusion !== "success" || buildEvidence?.head_sha !== testedQaSha) {
  preCutoverBlockers.push("The exact tested QA SHA does not have a successful Build workflow, including the PostgreSQL 17 clean-install and 248+19 guarded migration rehearsal.");
}
if (!/^[0-9a-f]{40}$/.test(expectedHeadSha)) {
  preCutoverBlockers.push("Set BETHAG_EXPECTED_COMMIT_SHA to the full 40-character SHA that passed QA/build/baseline.");
} else if (checkedOutHeadSha !== expectedHeadSha) {
  preCutoverBlockers.push("The checked-out commit does not match BETHAG_EXPECTED_COMMIT_SHA.");
}
if (!/^[0-9a-f]{40}$/.test(testedQaSha)) {
  preCutoverBlockers.push("Set BETHAG_QA_TESTED_COMMIT_SHA to the full SHA that passed QA/build/baseline.");
}
if (appEvidence.reviewed_head_sha !== testedQaSha) {
  preCutoverBlockers.push("Final QA evidence SHA does not match BETHAG_QA_TESTED_COMMIT_SHA.");
}
for (const requiredWorkflow of ["final_qa_collaudo", "build", "baseline_safety"]) {
  if (!appEvidence.workflow_runs?.[requiredWorkflow]) {
    preCutoverBlockers.push(`Missing ${requiredWorkflow} workflow evidence.`);
  }
}
for (const [name, run] of Object.entries(appEvidence.workflow_runs ?? {})) {
  if (run.conclusion !== "success" || run.head_sha !== testedQaSha) {
    preCutoverBlockers.push(`${name} evidence is not SUCCESS on the pinned tested commit.`);
  }
}
if (/^[0-9a-f]{40}$/.test(testedQaSha) && /^[0-9a-f]{40}$/.test(expectedHeadSha)) {
  let qaIsAncestor = true;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", testedQaSha, expectedHeadSha], { stdio: "ignore" });
  } catch {
    qaIsAncestor = false;
  }
  try {
    const testedFreeze = JSON.parse(execFileSync("git", [
      "show", `${testedQaSha}:supabase/rebuild/production-migration-cutover-freeze-20261105.json`,
    ], { encoding: "utf8" }));
    assert.deepEqual(frozenManifestPayload(freeze), frozenManifestPayload(testedFreeze),
      "Frozen migration sequence, live ledger, hashes or postflight contract changed after QA; only review/approval metadata may change.");
    const laterChanges = splitChangedPaths(execFileSync("git", ["diff", "--name-only", testedQaSha + ".." + expectedHeadSha], { encoding: "utf8" }));
    const allowedAfterTest = (path) => path.startsWith("docs/")
      || path === "supabase/rebuild/qa-final-collaudo-20261105.json"
      || path === "supabase/rebuild/production-ledger-20261105.json"
      || path === "supabase/rebuild/live-migration-ledgers-20261105.json"
      || path === "supabase/rebuild/production-read-only-preflight-20261108.md"
      || path === "scripts/verify-release-readiness.mjs"
      || path === "scripts/apply-reviewed-production-migrations.mjs"
      || path === "scripts/lib/release-readiness-utils.mjs"
      || path === "scripts/test-release-readiness-utils.mjs"
      || path === "scripts/test-canonical-cutover-runner.mjs"
      || path === "scripts/verify-canonical-cutover-runner.mjs"
      || path === "scripts/verify-environment-migration-alignment.mjs"
      || path === "supabase/rebuild/production-migration-cutover-freeze-20261105.json"
      || path === ".github/workflows/build.yml";
    const unexpected = laterChanges.filter((path) => !allowedAfterTest(path));
    if (unexpected.length) preCutoverBlockers.push("Application/migration/workflow files changed after the tested SHA: " + unexpected.join(", "));
    if (!qaIsAncestor) {
      console.log("QA provenance fallback: squash merge accepted only after exact allowlisted tree-delta and frozen-manifest checks.");
    }
  } catch {
    preCutoverBlockers.push("The tested QA commit is not an ancestor of the exact approved release commit and the squash-merge fallback checks failed.");
  }
} else {
  preCutoverBlockers.push("Cannot compare post-test changes until both BETHAG_QA_TESTED_COMMIT_SHA and BETHAG_EXPECTED_COMMIT_SHA are supplied.");
}
if (appEvidence.workflow_runs?.final_qa_collaudo?.conclusion !== "success") {
  preCutoverBlockers.push("Final authenticated QA collaudo did not complete successfully.");
}
for (let number = 1; number <= 13; number++) {
  const key = "APP-" + String(number).padStart(2, "0");
  const evidence = getApplicationTest(appEvidence.application_tests, number);
  if (evidence !== "PASS" && evidence?.status !== "PASS") {
    preCutoverBlockers.push(`${key} is not recorded as PASS in the pinned acceptance evidence.`);
  }
}
const app15 = getApplicationTest(appEvidence.application_tests, 15);
if (app15 !== "PASS" && app15?.status !== "PASS") {
  preCutoverBlockers.push("APP-15 is not recorded as PASS in the pinned acceptance evidence.");
}
const app12 = getApplicationTest(appEvidence.application_tests, 12);
const providerDeliveryPass = app12?.provider_delivery === "PASS"
  || (typeof app12?.provider_delivery_observed === "string" && app12.provider_delivery_observed.startsWith("PASS"));
if (app12?.status !== "PASS" || !providerDeliveryPass) {
  preCutoverBlockers.push("APP-12 provider delivery remains PARTIAL: configure QA RESEND_API_KEY/BETHAG_FROM_EMAIL and verify delivery.");
}
if (process.env.BETHAG_QA_APP_ACCEPTANCE_COMPLETE !== "YES") {
  preCutoverBlockers.push("QA application acceptance has not been explicitly attested complete.");
}
if (process.env.BETHAG_PRODUCTION_DATA_API_EXPOSURE_VERIFIED !== "YES") {
  preCutoverBlockers.push("Production Data API exposure for provider-managed schema supabase_functions has not been verified in Dashboard.");
}
const userApproval = freeze.user_authorization ?? {};
const approvedSourceSha = process.env.BETHAG_APPROVED_SOURCE_COMMIT_SHA?.trim() || "";
const approvedExecutionSha = process.env.BETHAG_APPROVED_EXECUTION_COMMIT_SHA?.trim() || "";
const expectedApprovalHashes = freeze.sequence.map(({ file, git_blob_sha }) => ({ file, git_blob_sha }));
const exactSourceAndMigrationApprovalRecorded =
  freeze.status === "FROZEN_FOR_REVIEW_APPROVED"
  && userApproval.status === "RECEIVED"
  && /^[0-9a-f]{40}$/.test(approvedSourceSha)
  && userApproval.approved_commit_sha === approvedSourceSha
  && Boolean(userApproval.approved_by)
  && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(userApproval.approved_at_utc ?? "")
  && Boolean(userApproval.approval_reference)
  && JSON.stringify(userApproval.approved_migration_hashes) === JSON.stringify(expectedApprovalHashes);
if (!exactSourceAndMigrationApprovalRecorded) {
  preCutoverBlockers.push("Final written owner approval is not recorded for the pinned source SHA and exact ordered nineteen SQL hashes.");
}
const exactExecutionCommitApprovalReceived =
  /^[0-9a-f]{40}$/.test(expectedHeadSha)
  && approvedExecutionSha === expectedHeadSha;
if (!exactExecutionCommitApprovalReceived) {
  preCutoverBlockers.push("The exact executable checkout SHA has not been separately approved via BETHAG_APPROVED_EXECUTION_COMMIT_SHA.");
}
const physicalRestoreVerified = process.env.BETHAG_PRODUCTION_BACKUP_VERIFIED === "YES";
const historicalRiskAcceptance = freeze.backup_restore_risk_acceptance?.accepted === true;
const riskAccepted = process.env.BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED === "YES";
if (!physicalRestoreVerified && !riskAccepted) {
  preCutoverBlockers.push("Provider-managed physical restore is unverified; fresh per-cutover residual-risk reconfirmation is required. Historical manifest acceptance is not sufficient.");
}
if (!hasPostgresConnectionConfig(process.env)) {
  preCutoverBlockers.push("PostgreSQL connection is not configured: provide DATABASE_URL or the complete libpq tuple PGHOST/PGDATABASE/PGUSER.");
}
if (process.env.BETHAG_CUTOVER_PLAN_APPROVED !== "YES") {
  preCutoverBlockers.push("The exact cutover plan, maintenance window, communication plan and rollback procedure are not approved.");
}
const app14 = getApplicationTest(appEvidence.application_tests, 14);
if (app14?.status !== "PASS") {
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
  checked_out_head_sha: checkedOutHeadSha,
  tested_head_sha: expectedHeadSha,
  final_qa_run_id: appEvidence.workflow_runs.final_qa_collaudo.run_id,
  app_statuses: appEvidence.application_tests,
  backup_restore: {
    provider_physical_restore_verified: physicalRestoreVerified,
    residual_risk_accepted_for_this_cutover: riskAccepted,
    historical_manifest_risk_acceptance_recorded: historicalRiskAcceptance,
    paid_restore_to_new_project_authorized: false,
  },
  historical_user_authorization_recorded: freeze.user_authorization?.status === "RECEIVED",
  approved_source_commit_sha: approvedSourceSha || null,
  exact_source_and_migration_approval_recorded: exactSourceAndMigrationApprovalRecorded,
  exact_execution_commit_approval_received: exactExecutionCommitApprovalReceived,
  fresh_cutover_plan_approval_received: process.env.BETHAG_CUTOVER_PLAN_APPROVED === "YES",
  ready_for_production_cutover: preCutoverBlockers.length === 0,
  ready_for_production_release: preCutoverBlockers.length === 0 && postCutoverBlockers.length === 0,
  pre_cutover_blockers: [...new Set(preCutoverBlockers)],
  post_cutover_blockers: [...new Set(postCutoverBlockers)],
  production_or_qa_modified_by_this_check: false,
};
console.log(JSON.stringify(report, null, 2));
if (preCutoverBlockers.length || postCutoverBlockers.length) process.exitCode = 1;
