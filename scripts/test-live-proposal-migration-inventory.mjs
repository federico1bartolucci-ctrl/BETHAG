import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const migrationRoot = "supabase/migrations";
const rebuildRoot = "supabase/rebuild";
const proposalFile = "20261124234000_revoke_postgres_global_public_function_execute.sql";
const proposalVersion = proposalFile.slice(0, 14);
const proposalName = proposalFile.slice(15, -4);

const [freeze, proposal, liveSnapshot, deployableFiles] = await Promise.all([
  readFile(rebuildRoot + "/production-migration-cutover-freeze-20261105.json", "utf8").then(JSON.parse),
  readFile(rebuildRoot + "/drafts/production-migration-cutover-live-20261124.json", "utf8").then(JSON.parse),
  readFile(rebuildRoot + "/drafts/production-ledger-live-20261124.json", "utf8").then(JSON.parse),
  readdir(migrationRoot).then(names => names.filter(name => name.endsWith(".sql")).sort()),
]);

const historicalFiles = deployableFiles;
const frozenHistoricalFiles = [
  ...freeze.clean_install.baseline_files,
  freeze.clean_install.existing_canonical_head,
  ...freeze.clean_install.pending_canonical_increments,
  ...freeze.clean_install.exact_production_forward_files,
].sort();

assert.equal(freeze.clean_install.migration_file_count, 28);
assert.equal(frozenHistoricalFiles.length, 28);
assert.deepEqual(historicalFiles, frozenHistoricalFiles,
  "The 28 frozen historical deployable migration files must remain unchanged.");
assert.equal(deployableFiles.length, 28,
  "The standard Supabase CLI inventory must contain only the 28 frozen canonical migrations.");
assert.ok(!deployableFiles.includes(proposalFile),
  "DRAFT_NOT_APPROVED candidate must not be visible to supabase db push.");

assert.equal(proposal.status, "DRAFT_NOT_APPROVED");
assert.equal(proposal.production_apply_authorized, false);
assert.equal(proposal.approval_scope, "NONE");
assert.equal(proposal.owner_authorization?.status, "EXPIRED_WINDOW_REQUIRES_NEW_APPROVAL",
  "Expired owner approval must remain historical and inactive.");
assert.equal(proposal.owner_authorization?.current_authorization, false,
  "Expired owner approval must not authorize Production execution.");
assert.equal(proposal.current_disposition?.production_apply_authorized, false,
  "Current disposition must remain fail-closed.");
assert.equal(proposal.live_ledger.rows, 267);
assert.equal(proposal.live_ledger.head_version, "20261105050000");
assert.equal(proposal.live_ledger.exact_version_name_match, true);
assert.equal(proposal.clean_install.migration_file_count, 28);
assert.equal(proposal.sequence.length, 1);
assert.equal(proposal.sequence[0].file, proposalFile);
assert.equal(proposal.sequence[0].git_blob_sha, proposal.live_ledger.proposed_addition.git_blob_sha);
assert.equal(proposal.sequence[0].production_status, "PENDING_NOT_APPLIED");

assert.equal(liveSnapshot.count, 267);
assert.equal(liveSnapshot.migrations.length, 267);
assert.deepEqual(liveSnapshot.head, {
  version: "20261105050000",
  name: "reconcile_portal_registration_upsert",
});
assert.ok(!liveSnapshot.migrations.some(row =>
  row.version === proposalVersion || row.name === proposalName),
  "The proposed migration must not already appear in the captured Production ledger.");

const gitBlobSha = (content) => {
  const canonicalContent = content.replace(/\r\n/g, "\n");
  const bytes = Buffer.from(canonicalContent, "utf8");
  return createHash("sha1")
    .update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes]))
    .digest("hex");
};

const draftSql = await readFile(rebuildRoot + "/drafts/" + proposalFile, "utf8");
const expectedBlobSha = proposal.sequence[0].git_blob_sha;
assert.equal(gitBlobSha(draftSql), expectedBlobSha,
  "Non-deployable draft proposal SQL differs from the exact reviewed Git blob.");

console.log(JSON.stringify({
  status: "PASS",
  frozen_historical_migration_files: historicalFiles.length,
  deployable_migration_files: deployableFiles.length,
  live_production_snapshot_rows: liveSnapshot.count,
  live_production_head: liveSnapshot.head,
  proposed_incremental_migrations: proposal.sequence.length,
  proposed_migration: proposalFile,
  proposal_blob_sha: expectedBlobSha,
  production_apply_authorized: proposal.production_apply_authorized,
}, null, 2));
