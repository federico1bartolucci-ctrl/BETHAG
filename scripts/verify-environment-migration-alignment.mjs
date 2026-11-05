import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const [live, freeze, snapshot] = await Promise.all([
  readFile(root + "/live-migration-ledgers-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261105.json", "utf8").then(JSON.parse),
  readFile(root + "/production-ledger-20261105.json", "utf8").then(JSON.parse),
]);
const files = (await readdir("supabase/migrations")).filter(file => file.endsWith(".sql")).sort();
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
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes])).digest("hex");
};

assert.equal(live.captured_at, "2026-11-05");
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
assert.equal(files.length, 28);
assert.equal(freeze.clean_install.migration_file_count, 28);
assert.ok(pending.every(item => files.includes(item.file)));
assert.ok(pending.every(item => !productionSet.has(item.version + "|" + item.name)));
assert.ok(freeze.live_ledger.forward_migrations_after_2026_11_02_freeze.every(item =>
  productionSet.has(item.version + "|" + item.name)));
assert.ok(productionSet.has(freeze.live_ledger.production_only_migration.version + "|" + freeze.live_ledger.production_only_migration.name));

const productionOnlySql = await readFile(root + "/production-forward-migrations/" + freeze.live_ledger.production_only_migration.file, "utf8");
assert.equal(gitBlobSha(productionOnlySql), freeze.live_ledger.production_only_migration.git_blob_sha);
assert.equal(freeze.status, "FROZEN_FOR_REVIEW_AUTHORIZED_BY_USER_GATES_PENDING");

const blockers = [
  "The guarded runner requires a direct PostgreSQL DATABASE_URL; Supabase MCP apply_migration generates server-side timestamps and would create migration-version drift.",
  "Reconfirm the 28 October provider backup/restore proof against current Production retention and capture the latest backup identifier.",
  "Production Data API exposure configuration must be verified in Dashboard before release.",
  "The 248-row plus sixteen-migration rehearsal must pass before any Production DDL.",
];

console.log(JSON.stringify({
  status: "PASS — current 248/283 live ledger snapshots and superseding cutover manifest are internally consistent",
  production: { rows: live.production.count, head: live.production.latest },
  qa: { rows: live.qa.count, head: live.qa.latest },
  common_exact_pairs: common.length,
  production_only: productionOnly,
  qa_only_count: qaOnly.length,
  canonical_migration_files: files.length,
  pending_canonical_increments: pending.length,
  expected_postflight_ledger_rows: freeze.expected_postflight.ledger_rows,
  historical_rows_to_rewrite: 0,
  cutover_blockers: blockers,
  remote_databases_modified: false,
}, null, 2));
