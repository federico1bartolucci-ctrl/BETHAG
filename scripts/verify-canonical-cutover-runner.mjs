import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "supabase/rebuild/production-migration-cutover-freeze-20261105.json"), "utf8"));
const runner = await readFile(join(root, "scripts/apply-reviewed-production-migrations.mjs"), "utf8");
const preflight = await readFile(join(root, "supabase/rebuild/production-cutover-preflight-20261105.sql"), "utf8");
const postflight = await readFile(join(root, "supabase/rebuild/production-cutover-postflight-20261105.sql"), "utf8");
const bootstrapTest = await readFile(join(root, "scripts/test-postgres-bootstrap.mjs"), "utf8");
const runnerTest = await readFile(join(root, "scripts/test-canonical-cutover-runner.mjs"), "utf8");
const cleanInstallFiles = (await readdir(join(root, "supabase/migrations"))).filter((name) => name.endsWith(".sql")).sort();
const expectedCleanInstallFiles = [
  ...manifest.clean_install.baseline_files,
  manifest.clean_install.existing_canonical_head,
  ...manifest.clean_install.pending_canonical_increments,
  ...manifest.clean_install.exact_production_forward_files,
].sort();
assert.equal(cleanInstallFiles.length, 28, "Clean-install migration directory must contain exactly 28 reviewed SQL files.");
assert.deepEqual(cleanInstallFiles, expectedCleanInstallFiles, "Deployable migration directory differs from the frozen 28-file clean-install sequence.");
const workflow = await readFile(join(root, ".github/workflows/build.yml"), "utf8");
const sha = (text) => {
  const bytes = Buffer.from(text, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
};
assert.equal(manifest.sequence.length, 19, "Superseding cutover must contain exactly nineteen incremental migrations.");
assert.match(preflight, /ledger_count <> 248 OR ledger_head <> '20261104222229'/, "Preflight must verify the current 248-row Production ledger.");
assert.match(preflight, /'20261102100200'/, "Preflight must reject a ledger where a pending archive-state migration is already present.");
assert.match(preflight, /collaborator permission function bodies do not match the reviewed pre-cutover state/,
  "Preflight must verify the expected pre-cutover collaborator authorization bodies.");
assert.match(preflight, /eighteen reviewed authenticated private RPC grants/,
  "Preflight must verify the expected missing authenticated private RPC grants before cutover.");
assert.match(preflight, /transfer-closure helper ACL differs from the reviewed pre-cutover state/,
  "Preflight must verify the transfer-closure helper pre-state.");
assert.match(postflight, /ledger_count <> 267 OR ledger_head <> '20261105050000'/, "Postflight must expect all nineteen canonical migrations and the correct ledger head.");
assert.match(postflight, /'20261104130000','reconcile_qa_security_and_coowner_rpcs'/, "Postflight must verify the final ACL/co-owner migration identity.");
assert.match(postflight, /'20261102100200','preserve_server_owned_condominium_archive_state'/, "Postflight must verify the archive-state migration identity.");
assert.match(postflight, /private\.upsert_portal_access_for_member/, "Postflight must verify portal registration helper wiring and ACLs.");
assert.match(postflight, /NOT has_function_privilege\('service_role','private\.check_condominium_member_transfer_closure/,
  "Postflight must verify service_role transfer-closure helper EXECUTE.");
assert.match(postflight, /expected nineteen exact canonical version\/name pairs/,
  "Postflight must state the correct nineteen-migration sequence.");
assert.match(postflight, /canonical_count <> 19 THEN/, "Postflight must verify all nineteen canonical migration records.");
assert.match(postflight, /ledger_count <> 267 OR ledger_head <> '20261105050000'/, "Postflight must retain the latest Production forward version while adding the nineteen canonical increments.");
assert.equal(manifest.live_ledger.rows, 248);
assert.equal(manifest.expected_postflight.ledger_rows, 267);
assert.equal(manifest.expected_postflight.workspace_members_data_column_present, true);
assert.equal(manifest.expected_postflight.save_condominium_archive_state_preserved, true);
assert.equal(manifest.expected_postflight.portal_registration_upsert_helper, true);
assert.equal(manifest.expected_postflight.portal_registration_authenticated_callers, true);
assert.equal(manifest.live_ledger.exact_version_name_pair_match, true);
assert.equal(manifest.status, "FROZEN_FOR_REVIEW_AUTHORIZED_BY_USER_GATES_PENDING");
assert.equal(manifest.live_ledger.forward_migrations_after_2026_11_02_freeze.length, 3);
assert.equal(manifest.live_ledger.production_only_migration.version, "20261104222229");
assert.equal(manifest.live_ledger.production_only_migration.name, "reconcile_production_acl_least_privilege");
const productionOnlySql = await readFile(join(root, "supabase/rebuild/production-forward-migrations", manifest.live_ledger.production_only_migration.file), "utf8");
assert.equal(sha(productionOnlySql), manifest.live_ledger.production_only_migration.git_blob_sha,
  "Production-only migration replay differs from captured reviewed blob.");
assert.match(bootstrapTest, /20261102151610_harden_live_production_acl_and_transfer_invoker\.sql/);
assert.match(bootstrapTest, /20261102200855_restore_secure_communication_recipient_rpc_execute\.sql/);
assert.match(bootstrapTest, /20261103070901_grant_service_role_private_resend_event_rpc\.sql/);
assert.match(bootstrapTest, /Applying the existing canonical Production head/);
assert.match(bootstrapTest, /pendingCanonicalMigrations/);
assert.match(runnerTest, /Applying existing canonical Production head/);
assert.match(runnerTest, /Applying exact Production-forward SQL/);
assert.match(runnerTest, /Replaying already-applied Production-only migration/);
assert.match(runnerTest, /production-cutover-preflight-20261105\.sql/);
assert.match(runnerTest, /production-cutover-postflight-20261105\.sql/);
assert.match(runnerTest, /gitBlobSha\(sql\), item\.git_blob_sha/);
assert.match(workflow, /bethag_runner_test/);

for (const item of manifest.live_ledger.forward_migrations_after_2026_11_02_freeze) {
  const sql = await readFile(join(root, "supabase/rebuild/production-forward-migrations", item.file), "utf8");
  const deployableSql = await readFile(join(root, "supabase/migrations", item.file), "utf8");
  assert.equal(sha(deployableSql), item.git_blob_sha, "Deployable Production-forward SQL differs from exact ledger payload: " + item.file);
  assert.equal(sha(sql), item.git_blob_sha, "Production-forward SQL blob differs from the captured live ledger payload: " + item.file);
}
assert.match(runner, /BETHAG_ALLOW_PRODUCTION_MIGRATIONS/);
assert.match(runner, /BETHAG_PRODUCTION_PROJECT_REF/);
assert.ok(runner.includes("BETHAG_PSQL_BIN"), "Runner must support an explicit local psql executable path.");
assert.ok(runner.includes("hasLibpqEnvironment"), "Runner must support locally configured libpq connection variables.");
assert.ok(runner.includes("connectionArgs"), "Runner must support DATABASE_URL or libpq environment variables.");
assert.ok(runner.includes("BETHAG_CUTOVER_PREFLIGHT_ONLY"), "Runner must provide a separate read-only Production preflight mode.");
assert.ok(runner.includes("isExpectedProductionTarget"), "Runner must validate the Production target before preflight/apply.");
assert.match(runner, /Live Production ledger vs frozen snapshot/);
assert.match(runner, /Historical 248-row preservation/);
assert.match(runner, /CANONICAL_MIGRATION_LEDGER_PASS/);
assert.doesNotMatch(runner, /\bapply_migration\s*\(/i, "Runner must not invoke Supabase apply_migration().");
assert.doesNotMatch(runner, /DELETE\s+FROM\s+supabase_migrations\.schema_migrations/i);
assert.doesNotMatch(runner, /UPDATE\s+supabase_migrations\.schema_migrations/i);
assert.doesNotMatch(runner, /DROP\s+TABLE\s+supabase_migrations\.schema_migrations/i);

const versions = new Set();
for (const item of manifest.sequence) {
  assert.equal(item.production_status, "PENDING_NOT_APPLIED");
  assert.match(item.file, /^(\d{14})_([a-z0-9][a-z0-9_-]*)\.sql$/);
  const version = item.file.slice(0, 14);
  const name = item.file.slice(15, -4);
  assert.ok(!versions.has(version), `Duplicate canonical version ${version}`);
  versions.add(version);
  const sql = await readFile(join(root, "supabase/migrations", item.file), "utf8");
  assert.equal(sha(sql), item.git_blob_sha, `Frozen SQL blob mismatch: ${item.file}`);
  assert.ok(sql.trim().endsWith(";"), `Migration lacks terminal semicolon: ${item.file}`);
}
console.log(JSON.stringify({
  status: "PASS",
  runner: "guarded canonical-version-preserving transactional runner",
  migration_count: manifest.sequence.length,
  pinned_sql_blobs_verified: true,
  original_production_history_rows: 248,
  deletes_or_rewrites_of_historical_rows: false,
  live_database_touched: false,
}, null, 2));
