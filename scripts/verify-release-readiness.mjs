import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const root="supabase/rebuild";
const [production,qa,freeze,liveStatus]=await Promise.all([
 readFile(root+"/production-ledger-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/qa-ledger-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/production-migration-cutover-freeze-20261103.json","utf8").then(JSON.parse),
 readFile(root+"/live-environment-status-20261027.json","utf8").then(JSON.parse),
]);
const files=(await readdir("supabase/migrations")).filter(name=>name.endsWith(".sql")).sort();
const versions=files.map(file=>file.slice(0,14));
const pending=freeze.sequence.map(item=>({version:item.file.slice(0,14),name:item.file.slice(15,-4),file:item.file}));
const exact=(ledger,item)=>ledger.migrations.some(row=>row.version===item.version&&row.name===item.name);
const blockers=[];

assert.equal(production.count,247);
assert.equal(production.migrations.length,247);
assert.equal(production.latest.version,"20261103070901");
assert.equal(qa.count,47);
assert.equal(qa.branch_status,"MIGRATIONS_FAILED");
assert.equal(files.length,20);
assert.equal(new Set(versions).size,20);
assert.equal(pending.length,14);
if(!pending.every(item=>files.includes(item.file)&&!exact(production,item))) blockers.push("Canonical pending migration inventory differs from the frozen 14-file sequence.");
if(!freeze.live_ledger.forward_migrations_after_2026_11_02_freeze.every(item=>exact(production,item))) blockers.push("One or more live Production-forward migrations are missing from the captured ledger.");
if(freeze.live_catalog.supabase_admin_default_maintain_entries!==3) blockers.push("Provider-managed supabase_admin default ACL inventory changed; refresh and review.");
if(qa.branch_status==="MIGRATIONS_FAILED") blockers.push("QA branch reports MIGRATIONS_FAILED; do not use it as a release/cutover target.");
if(!freeze.rehearsal_evidence.new_ordered_rehearsal_run) blockers.push("Ordered PostgreSQL 17 rehearsal of baseline + existing head + three Production-forward migrations + fourteen pending increments has not passed.");
if(process.env.BETHAG_APP_01_15_ACCEPTANCE!=="YES") blockers.push("APP-01–APP-15 authenticated acceptance evidence is not recorded.");
if(process.env.BETHAG_LIVE_ACL_PARITY_VERIFIED!=="YES") blockers.push("Live object-by-object ACL/ownership/default-privilege parity has not been attested.");
if(process.env.BETHAG_CUTOVER_PLAN_APPROVED!=="YES") blockers.push("The 247-row migration tracking cutover plan has not been explicitly approved.");
if(process.env.BETHAG_QA_EQUIVALENCE_VERIFIED!=="YES") blockers.push("QA migration identities and SQL effects have not been fully reconciled.");
if(process.env.BETHAG_ALL_ENVIRONMENT_LEDGERS_CAPTURED!=="YES") blockers.push("Fresh ledgers for every QA/development environment have not been captured.");
const restoreGate=liveStatus.backup_restore_gate;
const physicalRestoreVerified=process.env.BETHAG_PRODUCTION_BACKUP_VERIFIED==="YES";
const riskAcceptedBy=(process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_BY??"").trim();
const riskAcceptedAt=(process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTED_AT_UTC??"").trim();
const riskEvidence=(process.env.BETHAG_PHYSICAL_RESTORE_RISK_ACCEPTANCE_EVIDENCE??"").trim();
const riskAccepted=riskAcceptedBy.length>0&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(riskAcceptedAt)&&riskEvidence.length>0;
if(!physicalRestoreVerified&&!riskAccepted) blockers.push("Provider physical restore is not evidenced and no named/timestamped/evidence-linked residual-risk acceptance is recorded.");
if(restoreGate.release_gate_passed!==true&&!physicalRestoreVerified&&!riskAccepted) blockers.push("The captured provider restore gate remains blocked.");

const report={
 project_ref:production.project_ref,
 production_ledger_rows:production.count,
 production_ledger_head:production.latest,
 preserved_historical_rows:247,
 pending_canonical_increments:pending.length,
 expected_ledger_rows_after_approved_tracking:261,
 production_forward_migrations:freeze.live_ledger.forward_migrations_after_2026_11_02_freeze,
 qa:{project_ref:qa.project_ref,ledger_rows:qa.count,branch_status:qa.branch_status},
 recovered_247_history_replayable_from_empty_database:false,
 historical_archive_action:"retain as immutable evidence; do not replay",
 provider_managed_default_maintain_entries:freeze.live_catalog.supabase_admin_default_maintain_entries,
 physical_restore_verified:physicalRestoreVerified,
 physical_restore_risk_acceptance:riskAccepted?{accepted_by:riskAcceptedBy,accepted_at_utc:riskAcceptedAt,evidence_reference:riskEvidence}:null,
 ready_for_production_cutover:blockers.length===0,
 blockers:[...new Set(blockers)],
 production_or_qa_modified:false,
};
console.log(JSON.stringify(report,null,2));
if(blockers.length) process.exitCode=1;
