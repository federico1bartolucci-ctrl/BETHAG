import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const live = JSON.parse(await readFile(root + "/live-migration-ledgers-20261105.json", "utf8"));
const production = live.production.migrations;
const qa = live.qa.migrations;
const pair = (row) => row.version + "|" + row.name;
const productionSet = new Set(production.map(pair));
const qaSet = new Set(qa.map(pair));
const productionOnly = production.filter((row) => !qaSet.has(pair(row)));
const qaOnly = qa.filter((row) => !productionSet.has(pair(row)));
const canonicalFiles = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();

assert.equal(live.captured_at, "2026-11-06");
assert.match(live.captured_at_utc ?? "", /^2026-11-06T\\d{2}:\\d{2}:\\d{2}Z$/);
assert.match(live.production.captured_at_utc ?? "", /^2026-11-06T\\d{2}:\\d{2}:\\d{2}Z$/);
assert.match(live.qa.captured_at_utc ?? "", /^2026-11-06T\\d{2}:\\d{2}:\\d{2}Z$/);
assert.equal(live.production.project_ref, "tctcgptrsmvgajqjgnev");
assert.equal(live.qa.project_ref, "jhuyhlzzydcgghrzeexn");
assert.equal(production.length, 248);
assert.equal(qa.length, 283);
assert.equal(new Set(production.map((row) => row.version)).size, production.length);
assert.equal(new Set(qa.map((row) => row.version)).size, qa.length);
assert.deepEqual(production.at(-1), { version: "20261104222229", name: "reconcile_production_acl_least_privilege" });
assert.deepEqual(qa.at(-1), { version: "20261105001928", name: "align_qa_fund_availability_view_acl" });
assert.equal(productionOnly.length, 1);
assert.deepEqual(productionOnly[0], { version: "20261104222229", name: "reconcile_production_acl_least_privilege" });
assert.equal(qaOnly.length, 36);
assert.equal(live.comparison.common_exact_pairs, 247);
assert.equal(live.comparison.production_only_count, 1);
assert.equal(live.comparison.qa_only_count, 36);
assert.deepEqual(productionOnly, live.comparison.production_only);
assert.deepEqual(qaOnly, live.comparison.qa_only);
const expectedForwardAclCandidates = [
  "20261105010000_reconcile_postgres_public_table_default_acl.sql",
  "20261105020000_revoke_public_execute_from_public_trigger_functions.sql",
  "20261105030000_reconcile_postgres_public_function_sequence_default_acl.sql",
];
assert.equal(canonicalFiles.length, 28, "Canonical migration chain unexpectedly changed; re-review snapshot before continuing.");
assert.deepEqual(
  canonicalFiles.filter((name) => expectedForwardAclCandidates.includes(name)),
  expectedForwardAclCandidates,
  "The three reviewed forward-only ACL candidates must remain in the canonical migration chain.",
);
assert.equal(live.safety.production_modified, false);
assert.equal(live.safety.qa_modified, false);
assert.equal(live.safety.reset_or_replay_performed, false);

console.log(JSON.stringify({
  status: "PASS — captured live ledgers are internally consistent; this is a snapshot verification, not a live network check",
  captured_at: live.captured_at,
  production_rows: production.length,
  production_head: production.at(-1),
  qa_rows: qa.length,
  qa_head: qa.at(-1),
  exact_common_pairs: live.comparison.common_exact_pairs,
  production_only: productionOnly,
  qa_only: qaOnly,
  canonical_migration_files: canonicalFiles.length,
  reviewed_forward_acl_candidates: expectedForwardAclCandidates.length,
  remote_databases_modified: false
}, null, 2));
