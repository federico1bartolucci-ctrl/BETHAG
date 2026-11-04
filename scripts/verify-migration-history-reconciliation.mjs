import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root = "supabase/rebuild";
const [production, qa, reconciliation, freeze] = await Promise.all([
  readFile(root + "/production-ledger-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/qa-ledger-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/migration-history-reconciliation-20261103.json", "utf8").then(JSON.parse),
  readFile(root + "/production-migration-cutover-freeze-20261103.json", "utf8").then(JSON.parse),
]);
const files = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();
const pairs = (rows) => rows.map((row) => row.version + "|" + row.name);
const productionPairs = new Set(pairs(production.migrations));
const expectedForward = [
  ["20261102151610","harden_live_production_acl_and_transfer_invoker"],
  ["20261102200855","restore_secure_communication_recipient_rpc_execute"],
  ["20261103070901","grant_service_role_private_resend_event_rpc"],
];
const pending = freeze.sequence.map((item) => ({version:item.file.slice(0,14),name:item.file.slice(15,-4),file:item.file}));

assert.equal(production.project_ref,"tctcgptrsmvgajqjgnev");
assert.equal(production.count,247);
assert.equal(production.migrations.length,247);
assert.equal(production.latest.version,"20261103070901");
assert.equal(production.latest.name,"grant_service_role_private_resend_event_rpc");
assert.equal(qa.project_ref,"jhuyhlzzydcgghrzeexn");
assert.equal(qa.count,47);
assert.equal(qa.migrations.length,47);
assert.equal(qa.branch_status,"MIGRATIONS_FAILED");
assert.equal(reconciliation.production.ledger_count,247);
assert.equal(reconciliation.qa.ledger_count,47);
assert.equal(freeze.live_ledger.rows,247);
assert.equal(freeze.live_ledger.head_version,"20261103070901");
assert.equal(freeze.sequence.length,15);
assert.equal(files.length,24);
assert.equal(new Set(production.migrations.map(row=>row.version)).size,247);
assert.equal(new Set(qa.migrations.map(row=>row.version)).size,47);
assert.deepEqual(production.migrations.map(row=>row.version),[...production.migrations.map(row=>row.version)].sort());
assert.deepEqual(qa.migrations.map(row=>row.version),[...qa.migrations.map(row=>row.version)].sort());
assert.deepEqual(production.migrations.slice(-3).map(row=>[row.version,row.name]),expectedForward);
assert.ok(pending.every(row=>files.includes(row.file)),"A frozen pending canonical migration file is missing.");
assert.ok(pending.every(row=>!productionPairs.has(row.version+"|"+row.name)),"A pending canonical migration is already present in Production.");
assert.ok(productionPairs.has("20261022202747|harden_close_member_transfer_search_path"),"Existing canonical head missing from Production ledger.");
assert.equal(new Set(files.map(file=>file.slice(0,14))).size,24,"Duplicate canonical migration timestamp.");
assert.ok(files.every(file=>/^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/.test(file)));
assert.equal(freeze.expected_postflight.ledger_rows,262);
assert.equal(freeze.expected_postflight.original_247_rows_unchanged,true);
assert.equal(freeze.expected_postflight.canonical_rows_added,15);
assert.equal(freeze.live_catalog.supabase_admin_default_maintain_entries,3);

const baselineFiles=files.slice(0,5);
assert.deepEqual(baselineFiles,[
 "20261017000001_bethag_baseline_schema.sql",
 "20261017000002_bethag_baseline_indexes_views.sql",
 "20261017000003_bethag_baseline_functions.sql",
 "20261017000004_bethag_baseline_security.sql",
 "20261017000005_bethag_baseline_grants.sql",
]);
console.log(JSON.stringify({
 migration_history_reconciliation:"PASS — current 247-row Production and 47-row QA snapshots are internally consistent",
 production_ledger_rows:production.count,
 production_head:production.latest,
 qa_ledger_rows:qa.count,
 qa_branch_status:qa.branch_status,
 clean_branch_files:files.length,
 baseline_files:baselineFiles.length,
 existing_canonical_head:"20261022202747_harden_close_member_transfer_search_path",
 production_forward_migrations:expectedForward,
 pending_canonical_increments:pending.length,
 expected_postflight_ledger_rows:262,
 historical_replay:"NOT SELF-CONTAINED — forensic archive retained; do not replay",
 production_modified:false,
 qa_modified:false,
},null,2));
