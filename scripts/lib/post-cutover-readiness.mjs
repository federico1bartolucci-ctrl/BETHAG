const SHA = /^[0-9a-f]{40}$/;
export function certifyPostCutover({ qa, production, backupRestore }) {
 const blockers=[]; const testedSha=qa?.tested_commit_sha; const releaseSha=production?.release_commit_sha;
 if(!SHA.test(testedSha??"")) blockers.push("QA tested_commit_sha is missing or invalid.");
 if(!SHA.test(releaseSha??"")) blockers.push("Production release_commit_sha is missing or invalid.");
 if(testedSha&&releaseSha&&testedSha!==releaseSha) blockers.push("QA evidence and Production release commit SHA do not match.");
 if(!qa?.workflow_runs||!["build","baseline_safety","final_qa_collaudo"].every(k=>qa.workflow_runs[k]?.conclusion==="success"&&qa.workflow_runs[k]?.head_sha===testedSha)) blockers.push("Required CI workflows are not all SUCCESS on the exact QA-tested SHA.");
 for(let n=1;n<=13;n++){const key="APP-"+String(n).padStart(2,"0"),e=qa?.application_tests?.[key]??qa?.application_tests?.["APP"+String(n).padStart(2,"0")];if(!(e==="PASS"||e?.status==="PASS"))blockers.push(key+" is not PASS in QA evidence.");}
 const app15=qa?.application_tests?.["APP-15"]??qa?.application_tests?.APP15;if(!(app15==="PASS"||app15?.status==="PASS"))blockers.push("APP-15 is not PASS in QA evidence.");
 const app12=qa?.application_tests?.["APP-12"]??qa?.application_tests?.APP12;
 if(app12?.status!=="PASS"||app12?.provider_delivery!=="PASS"||app12?.provider_delivery_observed!=="PASS") blockers.push("APP-12 provider delivery evidence must contain exact PASS values.");
 if(production?.status!=="READ_ONLY_VERIFIED") blockers.push("Production snapshot is not marked READ_ONLY_VERIFIED.");
 const ledger=production?.ledger;if(!ledger||ledger.unique!==true||!Number.isInteger(ledger.rows)||ledger.rows<=0||ledger.missing!==0||ledger.extra!==0||ledger.name_divergences!==0) blockers.push("Production migration ledger reconciliation is missing or not exact.");
 const catalog=production?.catalog,security=production?.security;if(!catalog||!Number.isInteger(catalog.application_relation_count)||catalog.application_relation_count<=0||!security||security.security_advisor_errors!==0||security.health_advisor_errors!==0||!Number.isInteger(security.rls_enabled_count)||security.rls_enabled_count!==catalog.application_relation_count) blockers.push("Production security/RLS evidence is incomplete or has failures.");
 if(production?.app14?.status!=="PASS") blockers.push("APP-14 Production smoke is not PASS.");
 if(backupRestore?.provider_restore!=="PASS") blockers.push("Physical provider restore must be PASS; a risk-acceptance declaration alone cannot authorize GO.");
 return {schema:"bethag-post-cutover-release-readiness-v1",tested_commit_sha:testedSha??null,production_release_commit_sha:releaseSha??null,status:blockers.length?"NO_GO":"EVIDENCE_COMPLETE",blockers,evidence_authentication:"NOT_VERIFIED_BY_CHECKER",limitations:["Evidence JSON is operator-supplied and not cryptographically authenticated.","CI runs, QA results, Production snapshots, provider delivery, and restore evidence are not independently fetched or verified by this checker."],production_or_qa_modified_by_checker:false};
}
