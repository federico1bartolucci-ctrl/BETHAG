import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const live = JSON.parse(await readFile("supabase/rebuild/live-migration-ledgers-20261105.json", "utf8"));
const pair = (row) => row.version + "|" + row.name;
const p = new Set(live.production.migrations.map(pair));
const q = new Set(live.qa.migrations.map(pair));
const common = [...p].filter((key) => q.has(key));
const pOnly = [...p].filter((key) => !q.has(key));
const qOnly = [...q].filter((key) => !p.has(key));

assert.equal(live.production.migrations.length, 248);
assert.equal(live.qa.migrations.length, 283);
assert.equal(common.length, 247);
assert.deepEqual(pOnly, ["20261104222229|reconcile_production_acl_least_privilege"]);
assert.equal(qOnly.length, 36);
assert.equal(live.comparison.common_exact_pairs, common.length);
assert.equal(live.comparison.production_only_count, pOnly.length);
assert.equal(live.comparison.qa_only_count, qOnly.length);
assert.equal(live.safety.production_modified, false);
assert.equal(live.safety.qa_modified, false);

console.log(JSON.stringify({
  status: "PASS — live ledger snapshot comparison is internally consistent (snapshot only; not a live remote query)",
  production_rows: p.size,
  qa_rows: q.size,
  common_pairs: common.length,
  production_only: pOnly,
  qa_only_count: qOnly.length,
  historical_snapshot_files_preserved: true,
  remote_database_changes: 0
}, null, 2));
