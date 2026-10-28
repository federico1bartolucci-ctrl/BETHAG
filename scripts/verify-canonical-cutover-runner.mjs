import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "supabase/rebuild/production-migration-cutover-freeze-20261027.json"), "utf8"));
const runner = await readFile(join(root, "scripts/apply-reviewed-production-migrations.mjs"), "utf8");
const preflight = await readFile(join(root, "supabase/rebuild/production-cutover-preflight-20261027.sql"), "utf8");
const postflight = await readFile(join(root, "supabase/rebuild/production-cutover-postflight-20261027.sql"), "utf8");
assert.equal(manifest.sequence.length, 12, "Frozen cutover must contain exactly twelve incremental migrations.");
assert.match(preflight, /'20261028100000'/, "Preflight must reject a ledger where the latest collaborator permission migration is already present.");
assert.match(postflight, /ledger_count <> 256 OR ledger_head <> '20261028100000'/, "Postflight must expect all twelve canonical migrations and the correct ledger head.");
assert.match(postflight, /'20261028100000','fix_collaborator_module_permission_boolean'/, "Postflight must verify the collaborator permission migration identity.");
assert.match(postflight, /\) <> 12 THEN/, "Postflight must verify all twelve canonical migration records.");
assert.equal(manifest.live_ledger.rows, 244);
assert.equal(manifest.live_ledger.exact_version_name_pair_match, true);
assert.equal(manifest.status, "FROZEN_FOR_REVIEW_NOT_AUTHORIZED_FOR_PRODUCTION");
assert.match(runner, /BETHAG_ALLOW_PRODUCTION_MIGRATIONS/);
assert.match(runner, /BETHAG_PRODUCTION_PROJECT_REF/);
assert.match(runner, /"--dbname",\s*process\.env\.DATABASE_URL/, "psql must receive DATABASE_URL as its database connection string.");
assert.match(runner, /Live Production ledger vs frozen snapshot/);
assert.match(runner, /Historical 244-row preservation/);
assert.match(runner, /CANONICAL_MIGRATION_LEDGER_PASS/);
assert.doesNotMatch(runner, /\bapply_migration\s*\(/i, "Runner must not invoke Supabase apply_migration().");
assert.doesNotMatch(runner, /DELETE\s+FROM\s+supabase_migrations\.schema_migrations/i);
assert.doesNotMatch(runner, /UPDATE\s+supabase_migrations\.schema_migrations/i);
assert.doesNotMatch(runner, /DROP\s+TABLE\s+supabase_migrations\.schema_migrations/i);

const sha = (text) => {
  const bytes = Buffer.from(text, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
};
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
  original_production_history_rows: 244,
  deletes_or_rewrites_of_historical_rows: false,
  live_database_touched: false,
}, null, 2));
