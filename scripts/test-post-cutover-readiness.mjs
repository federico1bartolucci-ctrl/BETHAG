import test from "node:test";
import assert from "node:assert/strict";
import { certifyPostCutover } from "./lib/post-cutover-readiness.mjs";
const sha="a".repeat(40);
function fixtures(){
 const application_tests={}; for(let n=1;n<=13;n++) application_tests["APP-"+String(n).padStart(2,"0")]="PASS";
 application_tests["APP-12"]={status:"PASS",provider_delivery_observed:"PASS"};
 application_tests["APP-15"]="PASS";
 return {qa:{tested_commit_sha:sha,workflow_runs:Object.fromEntries(["build","baseline_safety","final_qa_collaudo"].map(k=>[k,{conclusion:"success",head_sha:sha}])),application_tests},
 production:{status:"READ_ONLY_VERIFIED",release_commit_sha:sha,ledger:{unique:true,rows:267,missing:0,extra:0,name_divergences:0},catalog:{application_relation_count:47},security:{security_advisor_errors:0,health_advisor_errors:0,rls_enabled_count:47},app14:{status:"PASS"}},
 backupRestore:{provider_restore:"PASS"} };
}
test("certifier returns GO only for complete matching post-cutover evidence",()=>assert.equal(certifyPostCutover(fixtures()).status,"GO"));
test("mismatched source SHA blocks release",()=>{const f=fixtures();f.production.release_commit_sha="b".repeat(40);assert.equal(certifyPostCutover(f).status,"NO_GO");});
test("missing APP-14 blocks release",()=>{const f=fixtures();f.production.app14.status="PARTIAL";assert.equal(certifyPostCutover(f).status,"NO_GO");});
test("missing physical restore requires explicit risk disposition",()=>{const f=fixtures();f.backupRestore={};assert.equal(certifyPostCutover(f).status,"NO_GO");f.backupRestore={provider_restore:"NOT_TESTED",residual_risk_accepted:true,risk_approval_reference:"risk-approval-1",approved_by:"owner",approved_at:"2026-11-20T00:00:00Z",approval_scope:"BETHAG_RELEASE_RISK_ACCEPTANCE"};assert.equal(certifyPostCutover(f).status,"GO");});
test("missing CI or acceptance status blocks release",()=>{const f=fixtures();f.qa.workflow_runs.build.head_sha="c".repeat(40);f.qa.application_tests["APP-03"]="PARTIAL";const r=certifyPostCutover(f);assert.equal(r.status,"NO_GO");assert.ok(r.blockers.some(x=>x.includes("CI")));assert.ok(r.blockers.some(x=>x.includes("APP-03")));});
