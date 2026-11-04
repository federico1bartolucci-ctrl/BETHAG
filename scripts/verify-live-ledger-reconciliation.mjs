import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root="supabase/rebuild";
const [production,qa,reconciliation,freeze]=await Promise.all([
 readFile(root+"/production-ledger-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/qa-ledger-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/migration-history-reconciliation-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/production-migration-cutover-freeze-20261103.json","utf8").then(JSON.parse),
]);
const files=(await readdir("supabase/migrations")).filter(file=>file.endsWith(".sql")).sort();
const exact=(ledger,item)=>ledger.migrations.some(row=>row.version===item.version&&row.name===item.name);
const pending=freeze.sequence.map(item=>({version:item.file.slice(0,14),name:item.file.slice(15,-4),file:item.file}));
assert.equal(production.count,247);
assert.equal(production.migrations.length,247);
assert.equal(production.latest.version,"20261103070901");
assert.equal(qa.count,47);
assert.equal(qa.branch_status,"MIGRATIONS_FAILED");
assert.equal(reconciliation.production.ledger_count,247);
assert.equal(reconciliation.qa.ledger_count,47);
assert.equal(files.length,24);
assert.equal(pending.length,15);
assert.ok(pending.every(item=>files.includes(item.file)&&!exact(production,item)));
assert.ok(freeze.live_ledger.forward_migrations_after_2026_11_02_freeze.every(item=>exact(production,item)));
assert.equal(freeze.expected_postflight.ledger_rows,262);
assert.equal(freeze.expected_postflight.original_247_rows_unchanged,true);
assert.equal(freeze.expected_postflight.canonical_rows_added,15);
console.log(JSON.stringify({
 status:"PASS — live read-only 2026-11-03 migration ledger snapshots and canonical candidate reconcile",
 production:{count:production.count,head:production.latest},
 qa:{count:qa.count,head:qa.latest,status:qa.branch_status},
 canonical_migrations:files.length,
 pending_incrementals:pending.length,
 production_forward_migrations:freeze.live_ledger.forward_migrations_after_2026_11_02_freeze,
 expected_ledger_after_approved_tracking:262,
 production_or_qa_modified:false,
},null,2));
