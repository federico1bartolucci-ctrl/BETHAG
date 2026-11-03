import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root="supabase/rebuild";
const [production,qa,reconciliation,freeze,liveStatus]=await Promise.all([
 readFile(root+"/production-ledger-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/qa-ledger-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/migration-history-reconciliation-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/production-migration-cutover-freeze-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/live-environment-status-20261027.json","utf8").then(JSON.parse),
]);
const files=(await readdir("supabase/migrations")).filter(file=>file.endsWith(".sql")).sort();
const pending=freeze.sequence.map(item=>({version:item.file.slice(0,14),name:item.file.slice(15,-4),file:item.file}));
const exact=(ledger,item)=>ledger.migrations.some(row=>row.version===item.version&&row.name===item.name);

assert.equal(production.count,247);
assert.equal(production.migrations.length,247);
assert.deepEqual(production.latest,{version:"20261103070901",name:"grant_service_role_private_resend_event_rpc"});
assert.equal(qa.count,47);
assert.equal(qa.migrations.length,47);
assert.equal(qa.branch_status,"MIGRATIONS_FAILED");
assert.equal(reconciliation.production.ledger_count,247);
assert.equal(reconciliation.qa.ledger_count,47);
assert.equal(freeze.live_ledger.rows,247);
assert.equal(freeze.expected_postflight.ledger_rows,261);
assert.equal(files.length,20);
assert.equal(pending.length,14);
assert.ok(pending.every(item=>files.includes(item.file)));
assert.ok(pending.every(item=>!exact(production,item)));
assert.ok(exact(production,{version:"20261022202747",name:"harden_close_member_transfer_search_path"}));
assert.ok(freeze.live_ledger.forward_migrations_after_2026_11_02_freeze.every(item=>exact(production,item)));

const restoreGate=liveStatus.backup_restore_gate;
assert.ok(restoreGate,"Missing historical provider backup/restore gate evidence.");
assert.equal(restoreGate.source_project_ref,"tctcgptrsmvgajqjgnev");
assert.equal(restoreGate.release_gate_passed,false,"Do not misrepresent the provider restore as passed.");
assert.equal(restoreGate.schema_acl_parity,"NOT VERIFIED");
assert.equal(restoreGate.target_project_ref,null);
assert.equal(restoreGate.restore_completed_at_utc,null);

const blockers=[
 "QA branch currently reports MIGRATIONS_FAILED; do not use it as cutover target.",
 "Three Supabase-managed supabase_admin default ACL entries still grant MAINTAIN; provider guidance or named security-owner disposition required.",
 "Provider-backed physical restore has not been performed; do not claim it has.",
 "APP-01–APP-15 full authenticated acceptance evidence is not recorded.",
 "Written cutover approval, exact commit/hash list, maintenance window and rollback criteria are not recorded.",
];
console.log(JSON.stringify({
 environment_migration_alignment:"PASS — latest read-only Production/QA ledgers and frozen 14-migration sequence are consistent",
 environments:[
  {name:"production",project_ref:production.project_ref,ledger_count:production.count,ledger_head:production.latest},
  {name:"qa",project_ref:qa.project_ref,ledger_count:qa.count,ledger_head:qa.latest,branch_status:qa.branch_status},
 ],
 production_forward_migrations_preserved:freeze.live_ledger.forward_migrations_after_2026_11_02_freeze,
 clean_branch_migration_files:files.length,
 pending_canonical_migrations:pending.length,
 expected_postflight_ledger_rows:261,
 historical_ledger_rows_to_rewrite:0,
 backup_restore_gate:"BLOCKED — provider physical restore not evidenced",
 cutover_blockers:blockers,
 production_or_qa_modified:false,
},null,2));
