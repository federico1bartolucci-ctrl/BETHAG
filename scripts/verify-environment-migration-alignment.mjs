import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const liveProposalFile = "20261124234000_revoke_postgres_global_public_function_execute.sql";
const [live, freeze, snapshot, liveProposal, liveProposalSnapshot] = await Promise.all([
  readFile(root + "/live-migration-ledgers-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/production-ledger-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/drafts/production-migration-cutover-live-20261124.json", "utf8").then(JSON.parse),
  readFile(root + "/drafts/production-ledger-live-20261124.json", "utf8").then(JSON.parse),
]);
const deployableFiles = (await readdir("supabase/migrations")).filter(file => file.endsWith(".sql")).sort();
const files = deployableFiles.filter(file => file !== liveProposalFile);
const productionSet = new Set(live.production.migrations.map(row => row.version + "|" + row.name));
const qaSet = new Set(live.qa.migrations.map(row => row.version + "|" + row.name));
const common = [...productionSet].filter(pair => qaSet.has(pair));
const productionOnly = [...productionSet].filter(pair => !qaSet.has(pair));
const qaOnly = [...qaSet].filter(pair => !productionSet.has(pair));
const pending = freeze.sequence.map(item => ({
  version: item.file.slice(0, 14),
  name: item.file.slice(15, -4),
  file: item.file,
}));
const gitBlobSha = (content) => {
  const canonicalContent = content.replace(/\r\n/g, "\n");
  const bytes = Buffer.from(canonicalContent, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes])).digest("hex");
};

assert.match(live.captured_at_utc ?? "", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
assert.equal(live.captured_at, live.captured_at_utc.slice(0, 10));
assert.match(live.production.captured_at_utc ?? "", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
assert.equal(live.production.captured_at_utc.slice(0, 10), live.captured_at);
assert.match(live.qa.captured_at_utc ?? "", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
assert.equal(live.qa.captured_at_utc.slice(0, 10), live.captured_at);
assert.equal(live.production.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(live.production.count, 248);
assert.equal(live.production.migrations.length, 248);
assert.deepEqual(live.production.latest, { version: "20261104222229", name: "reconcile_production_acl_least_privilege" });
assert.equal(live.qa.project_ref, "jhuyhlzzydcgghrzeexn");
assert.equal(live.qa.count, 283);
assert.equal(live.qa.migrations.length, 283);
assert.deepEqual(live.qa.latest, { version: "20261105001928", name: "align_qa_fund_availability_view_acl" });
assert.equal(common.length, 247);
assert.deepEqual(productionOnly, ["20261104222229|reconcile_production_acl_least_privilege"]);
assert.equal(qaOnly.length, 36);
assert.equal(live.comparison.common_exact_pairs, 247);
assert.equal(live.comparison.production_only_count, 1);
assert.equal(live.comparison.qa_only_count, 36);

assert.equal(snapshot.count, 248);
assert.deepEqual(snapshot.latest, live.production.latest);
assert.deepEqual(snapshot.migrations, live.production.migrations);
assert.equal(freeze.live_ledger.rows, 248);
assert.equal(freeze.live_ledger.exact_version_name_pair_match, true);
assert.equal(freeze.expected_postflight.ledger_rows, 267);
assert.equal(freeze.sequence.length, 19);
assert.equal(freeze.live_ledger.production_only_migration.version, "20261104222229");
assert.equal(freeze.live_ledger.production_only_migration.name, "reconcile_production_acl_least_privilege");

// The 248/283 files above are the immutable 5 November historical snapshots,
// not the 24 November live ledger. Keep the historical freeze separate from
// the current 267-row one-migration proposal.
assert.equal(files.length, 28, "Frozen historical canonical migration files must remain at 28.");
assert.equal(deployableFiles.length, 29,
  "Expected 28 frozen historical files plus exactly one separately reviewed live proposal.");
assert.ok(deployableFiles.includes(liveProposalFile));
assert.equal(freeze.clean_install.migration_file_count, 28);
assert.ok(pending.every(item => files.includes(item.file)));
assert.ok(pending.every(item => !productionSet.has(item.version + "|" + item.name)));
assert.ok(freeze.live_ledger.forward_migrations_after_2026_11_02_freeze.every(item =>
  productionSet.has(item.version + "|" + item.name)));
assert.ok(productionSet.has(freeze.live_ledger.production_only_migration.version + "|" + freeze.live_ledger.production_only_migration.name));

assert.equal(liveProposal.status, "DRAFT_NOT_APPROVED");
assert.equal(liveProposal.production_apply_authorized, false);
assert.equal(liveProposal.approval_scope, "NONE");
assert.equal(liveProposal.live_ledger.rows, 267);
assert.equal(liveProposal.live_ledger.head_version, "20261105050000");
assert.equal(liveProposal.live_ledger.exact_version_name_match, true);
assert.equal(liveProposalSnapshot.count, 267);
assert.equal(liveProposalSnapshot.migrations.length, 267);
assert.deepEqual(liveProposalSnapshot.head, {
  version: "20261105050000",
  name: "reconcile_portal_registration_upsert",
});
assert.equal(liveProposal.sequence.length, 1);
assert.equal(liveProposal.sequence[0].file, liveProposalFile);
assert.equal(liveProposal.sequence[0].git_blob_sha, liveProposal.live_ledger.proposed_addition.git_blob_sha);
assert.equal(liveProposal.clean_install.migration_file_count, 29);
assert.ok(!liveProposalSnapshot.migrations.some(row =>
  row.version === liveProposal.sequence[0].file.slice(0, 14)
  || row.name === liveProposal.sequence[0].file.slice(15, -4)));

const [proposalSql, draftProposalSql] = await Promise.all([
  readFile("supabase/migrations/" + liveProposalFile, "utf8"),
  readFile(root + "/drafts/" + liveProposalFile, "utf8"),
]);
assert.equal(gitBlobSha(proposalSql), liveProposal.sequence[0].git_blob_sha);
assert.equal(gitBlobSha(draftProposalSql), liveProposal.sequence[0].git_blob_sha);

const productionOnlySql = await readFile(root + "/production-forward-migrations/" + freeze.live_ledger.production_only_migration.file, "utf8");
assert.equal(gitBlobSha(productionOnlySql), freeze.live_ledger.production_only_migration.git_blob_sha);
assert.ok(
  ["FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING", "FROZEN_FOR_REVIEW_APPROVED"].includes(freeze.status),
  "Freeze must remain pending or carry an explicit final approval record.",
);
if (freeze.status === "FROZEN_FOR_REVIEW_APPROVED") {
  const approval = freeze.user_authorization;
  assert.equal(approval?.status, "RECEIVED");
  assert.match(approval?.approved_commit_sha ?? "", /^[0-9a-f]{40}$/);
  assert.ok(Boolean(approval?.approved_by)
    && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(approval?.approved_at_utc ?? "")
    && Boolean(approval?.approval_reference));
  assert.deepEqual(approval?.approved_migration_hashes,
    freeze.sequence.map(({ file, git_blob_sha }) => ({ file, git_blob_sha })));
}

const blockers = [
  "The guarded runner requires a direct PostgreSQL DATABASE_URL; Supabase MCP apply_migration generates server-side timestamps and would create migration-version drift.",
  "Reconfirm the 28 October provider backup/restore proof against current Production retention and capture the latest backup identifier.",
  "Production Data API exposure configuration must be verified in Dashboard before release.",
  "The exact 267-row live ledger plus one-migration rehearsal must pass before any Production DDL.",
];

console.log(JSON.stringify({
  status: "PASS — historical 248/283 snapshots and separate 267-row live-ledger proposal are internally consistent",
  historical_production_snapshot: { rows: live.production.count, head: live.production.latest },
  historical_qa_snapshot: { rows: live.qa.count, head: live.qa.latest },
  live_production_proposal_snapshot: { rows: liveProposalSnapshot.count, head: liveProposalSnapshot.head },
  common_exact_pairs: common.length,
  production_only: productionOnly,
  qa_only_count: qaOnly.length,
  frozen_historical_migration_files: files.length,
  deployable_migration_files_in_proposal_branch: deployableFiles.length,
  pending_historical_canonical_increments: pending.length,
  proposed_live_increment: liveProposal.sequence[0].file,
  expected_postflight_ledger_rows: liveProposal.expected_postflight.ledger_rows,
  historical_rows_to_rewrite: 0,
  cutover_blockers: blockers,
  production_apply_authorized: liveProposal.production_apply_authorized,
  remote_databases_modified: false,
}, null, 2));
