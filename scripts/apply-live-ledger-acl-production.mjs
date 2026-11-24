#!/usr/bin/env node
/**
 * Dedicated forward-only runner for the single 267 -> 268 live-ledger ACL proposal.
 * It is separate from both the historical 248 -> 267 runner and the local-only rehearsal.
 * No Production connection is attempted unless a fresh, exact owner approval is present.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertLiveLedgerAclEvidenceMatchesSource } from "./lib/live-ledger-acl-approval-guard.mjs";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const projectRef="tctcgptrsmvgajqjgnev";
const candidate="20261124234000_revoke_postgres_global_public_function_execute.sql";
const snapshotPath=join(root,"supabase/rebuild/drafts/production-ledger-live-20261124.json");
const manifestPath=join(root,"supabase/rebuild/drafts/production-migration-cutover-live-20261124.json");
const candidatePath=join(root,"supabase/migrations",candidate);
const preflightPath=join(root,"supabase/rebuild/drafts/production-cutover-preflight-live-20261124.sql");
const postflightPath=join(root,"supabase/rebuild/drafts/production-cutover-postflight-live-20261124.sql");
const blobSha=s=>{const t=s.replace(/\r\n/g,"\n"),b=Buffer.from(t);return createHash("sha1").update(Buffer.concat([Buffer.from("blob "+b.length+"\0"),b])).digest("hex");};
const fingerprintSha=s=>createHash("sha256").update(s).digest("hex");
const lit=s=>"'"+String(s).replaceAll("'","''")+"'";
const passEscape=s=>String(s??"").replaceAll("\\","\\\\").replaceAll(":","\\:");

function targetUrl(value){
  let u; try{u=new URL(value);}catch{throw new Error("STOP: DATABASE_URL must identify the approved Production PostgreSQL target.");}
  assert.ok(["postgres:","postgresql:"].includes(u.protocol),"STOP: PostgreSQL protocol required.");
  const direct=u.hostname===`db.${projectRef}.supabase.co`&&decodeURIComponent(u.username)==="postgres";
  const pooler=u.hostname.endsWith(".pooler.supabase.com")&&decodeURIComponent(u.username)===`postgres.${projectRef}`;
  assert.ok((direct||pooler)&&decodeURIComponent(u.pathname.slice(1))==="postgres","STOP: target is not the exact approved BETHAG Production database.");
  const sslMode=(u.searchParams.get("sslmode")||process.env.PGSSLMODE||"require").toLowerCase();
  assert.ok(["require","verify-ca","verify-full"].includes(sslMode),"STOP: Production PostgreSQL connections must require TLS.");
  u.searchParams.set("sslmode",sslMode);
  const timeout=Number(u.searchParams.get("connect_timeout")||15);
  assert.ok(Number.isInteger(timeout)&&timeout>=1&&timeout<=60,"STOP: PostgreSQL connect_timeout must be between 1 and 60 seconds.");
  u.searchParams.set("connect_timeout",String(timeout));
  if(!u.searchParams.has("application_name"))u.searchParams.set("application_name","bethag-live-ledger-acl-production-runner");
  return u;
}
function exact(a,b,m){assert.equal(a,b,m);}
async function main(){
  exact(process.env.BETHAG_LIVE_LEDGER_PRODUCTION_APPLY,"YES","STOP: explicit live-ledger Production apply opt-in is missing.");
  exact(process.env.BETHAG_ALLOW_LIVE_LEDGER_PRODUCTION,"YES","STOP: second Production apply authorization is missing.");
  exact(process.env.BETHAG_PRODUCTION_PROJECT_REF,projectRef,"STOP: wrong Production project ref.");
  const expected=process.env.BETHAG_EXPECTED_COMMIT_SHA?.trim()||"";
  const approvedSource=process.env.BETHAG_APPROVED_SOURCE_COMMIT_SHA?.trim()||"";
  assert.match(approvedSource,/^[0-9a-f]{40}$/,"STOP: BETHAG_APPROVED_SOURCE_COMMIT_SHA must identify the exact owner-approved source release.");
  exact(execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),expected,"STOP: checkout differs from BETHAG_EXPECTED_COMMIT_SHA.");
  const dirty=execFileSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).trim();
  const unexpectedDirty=dirty.split("\n").filter(Boolean).filter(entry=>entry!=="?? node_modules/"&&entry!=="?? package-lock.json");
  exact(unexpectedDirty.length,0,"STOP: Production runner requires a clean checkout; only generated node_modules/package-lock artifacts may be untracked.");
  execFileSync("git",["cat-file","-e",approvedSource+"^{commit}"],{cwd:root,stdio:"ignore"});
  execFileSync("git",["merge-base","--is-ancestor",approvedSource,expected],{cwd:root,stdio:"ignore"});
  const postApprovalChanges=execFileSync("git",["diff","--name-only",approvedSource+".."+expected],{cwd:root,encoding:"utf8"}).trim().split("\n").filter(Boolean);
  assert.ok(postApprovalChanges.every(path=>path==="supabase/rebuild/drafts/production-migration-cutover-live-20261124.json"),
    "STOP: only the explicit owner-approval manifest may change after the approved source SHA.");

  const [manifest,snapshot,sql,preflight,postflight]=await Promise.all([
    readFile(manifestPath,"utf8").then(JSON.parse),readFile(snapshotPath,"utf8").then(JSON.parse),
    readFile(candidatePath,"utf8"),readFile(preflightPath,"utf8"),readFile(postflightPath,"utf8")
  ]);
  exact(manifest.status,"APPROVED_FOR_PRODUCTION_CUTOVER","STOP: manifest is not explicitly approved for Production cutover.");
  exact(manifest.approval_scope,"LIVE_LEDGER_ACL_267_TO_268","STOP: approval scope is not the single 267-to-268 live-ledger ACL migration.");
  exact(manifest.production_apply_authorized,true,"STOP: manifest does not authorize Production apply.");
  exact(manifest.sequence?.length,1,"STOP: runner accepts exactly one candidate migration.");
  const item=manifest.sequence[0];
  exact(item.file,candidate,"STOP: candidate migration filename differs.");
  exact(item.git_blob_sha,"499ea493e828243309ee2f4bb9c3242d2fbeb862","STOP: candidate SQL hash differs.");
  exact(blobSha(sql),item.git_blob_sha,"STOP: deployable candidate SQL hash mismatch.");
  exact(blobSha(await readFile(join(root,"supabase/rebuild/drafts",candidate),"utf8")),item.git_blob_sha,"STOP: archived candidate SQL hash mismatch.");
  exact(snapshot.project_ref,projectRef,"STOP: snapshot project ref differs.");
  exact(snapshot.count,267,"STOP: pinned ledger must contain 267 rows.");
  exact(snapshot.migrations?.length,267,"STOP: all 267 historical version/name pairs are required.");
  exact(snapshot.head?.version,"20261105050000","STOP: pinned ledger head differs.");
  exact(manifest.live_ledger?.rows,267,"STOP: manifest live ledger row count differs.");
  exact(manifest.live_ledger?.head_version,"20261105050000","STOP: manifest live ledger head differs.");
  exact(manifest.rehearsal_evidence?.full_clean_install,"PASS","STOP: 29-file PostgreSQL 17 clean-install rehearsal is not PASS in the reviewed manifest.");
  exact(manifest.rehearsal_evidence?.guarded_runner,"PASS","STOP: exact 267-to-268 local guarded-runner rehearsal is not PASS in the reviewed manifest.");
  exact(manifest.rehearsal_evidence?.global_function_default_acl_regression,"PASS","STOP: global function ACL regression is not PASS in the reviewed manifest.");

  const paths=["scripts/apply-live-ledger-acl-production.mjs","scripts/lib/live-ledger-acl-approval-guard.mjs","supabase/migrations/"+candidate,
    "supabase/rebuild/drafts/production-ledger-live-20261124.json",
    "supabase/rebuild/drafts/production-cutover-preflight-live-20261124.sql",
    "supabase/rebuild/drafts/production-cutover-postflight-live-20261124.sql"];
  const pieces=[];
  for(const path of paths.sort()) pieces.push(path+"\0"+(await readFile(join(root,path),"utf8")).replace(/\r\n/g,"\n")+"\0");
  const fingerprint=fingerprintSha("BETHAG-LIVE-LEDGER-ACL-267-TO-268\0"+approvedSource+"\0"+pieces.join(""));
  const approval=manifest.owner_authorization;
  exact(approval?.status,"RECEIVED","STOP: explicit owner authorization record is missing.");
  exact(approval?.approved_commit_sha,approvedSource,"STOP: approval does not bind this exact owner-approved source SHA.");
  exact(approval?.approved_release_fingerprint,fingerprint,"STOP: approval does not bind this exact release fingerprint.");
  exact(approval?.approved_target_project_ref,projectRef,"STOP: approval does not bind the exact Production project.");
  assert.ok(approval?.approved_by&&approval?.approval_reference,"STOP: approval must identify approver and evidence reference.");
  exact(approval?.independent_technical_review?.status,"PASS","STOP: independent technical review is not recorded as PASS.");
  assert.ok(approval?.independent_technical_review?.reviewer&&approval?.independent_technical_review?.evidence_reference,
    "STOP: independent technical review must identify reviewer and evidence.");
  exact(approval?.ci_tested_commit_sha,approvedSource,"STOP: Build/Baseline/PostgreSQL CI evidence must cover the exact approved source SHA.");
  exact(approval?.ci_build_status,"success","STOP: Build CI is not SUCCESS.");
  assert.ok(approval?.ci_build_run_reference,"STOP: Build CI run reference is missing.");
  exact(approval?.ci_baseline_safety_status,"success","STOP: Baseline Safety CI is not SUCCESS.");
  assert.ok(approval?.ci_baseline_safety_run_reference,"STOP: Baseline Safety CI run reference is missing.");
  exact(approval?.postgres17_rehearsal_status,"PASS","STOP: PostgreSQL 17 rehearsal evidence is not PASS.");
  assert.ok(approval?.postgres17_rehearsal_evidence_reference,"STOP: PostgreSQL 17 rehearsal evidence reference is missing.");
  exact(approval?.qa_final_workflow_status,"success","STOP: final APP-01..APP-15 workflow is skipped or unsuccessful.");
  assert.ok(approval?.qa_final_workflow_evidence_reference,"STOP: final APP-01..APP-15 workflow evidence reference is missing.");
  exact(approval?.qa_app_01_to_15_status,"PASS","STOP: APP-01..APP-15 are not freshly accepted as PASS.");
  assert.match(approval?.qa_tested_commit_sha??"",/^[0-9a-f]{40}$/,"STOP: QA acceptance must identify the exact tested commit SHA.");
  assertLiveLedgerAclEvidenceMatchesSource(approval,approvedSource);
  assert.ok(approval?.qa_evidence_reference,"STOP: QA APP-01..APP-15 evidence reference is missing.");
  exact(approval?.data_api_exposure_verified,true,"STOP: fresh Production Data API exposure verification is missing.");
  assert.ok(approval?.data_api_exposure_evidence_reference,"STOP: Data API exposure verification evidence is missing.");
  const exposureAt=Date.parse(approval?.data_api_exposure_verified_at_utc??"");
  assert.ok(Number.isFinite(exposureAt)&&Date.now()>=exposureAt&&Date.now()-exposureAt<=24*60*60*1000,
    "STOP: Production Data API exposure evidence must be timestamped within the last 24 hours.");
  exact(approval?.residual_backup_risk_reconfirmed,true,"STOP: residual physical-restore risk has not been explicitly reconfirmed.");
  assert.ok(approval?.residual_backup_risk_evidence_reference,"STOP: residual backup-risk reconfirmation evidence is missing.");
  assert.notEqual(approval?.independent_technical_review?.reviewer,approval?.approved_by,
    "STOP: independent technical reviewer must be distinct from the owner approver.");
  assert.deepEqual(approval?.approved_migration_hashes,manifest.sequence.map(({file,git_blob_sha})=>({file,git_blob_sha})),"STOP: approval does not cover the exact candidate hash.");
  assert.match(approval?.approved_window_start_utc??"",/^\d{4}-\d{2}-\d{2}T.*Z$/,"STOP: execution window start must be an explicit UTC timestamp.");
  assert.match(approval?.approved_window_end_utc??"",/^\d{4}-\d{2}-\d{2}T.*Z$/,"STOP: execution window end must be an explicit UTC timestamp.");
  const start=Date.parse(approval.approved_window_start_utc),end=Date.parse(approval.approved_window_end_utc);
  assert.ok(Number.isFinite(start)&&Number.isFinite(end)&&end>start,"STOP: approval must specify a valid UTC execution window.");
  assert.ok(Date.now()>=start&&Date.now()<=end,"STOP: current time is outside the approved UTC execution window.");

  const db=targetUrl(process.env.DATABASE_URL||"");
  const vals=snapshot.migrations.map(({version,name})=>{
    assert.match(version,/^\d{14}$/);assert.match(name,/^[a-z0-9][a-z0-9_-]*$/);
    return "("+lit(version)+","+lit(name)+")";
  }).join(",\n");
  const exactLedgerGuard=`DO $ledger_guard$
BEGIN
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 267 THEN
  RAISE EXCEPTION 'STOP: expected exactly 267 historical ledger rows';
 END IF;
 IF EXISTS (WITH expected(version,name) AS (VALUES
${vals}
 ) SELECT 1 FROM (
  (SELECT version,name FROM expected EXCEPT SELECT version,name FROM supabase_migrations.schema_migrations)
  UNION ALL
  (SELECT version,name FROM supabase_migrations.schema_migrations EXCEPT SELECT version,name FROM expected)
 ) delta) THEN
  RAISE EXCEPTION 'STOP: one or more historical version/name pairs differs from the pinned Production snapshot';
 END IF;
END
$ledger_guard$;`;
  const exactLedgerPostGuard = `DO $ledger_post_guard$
BEGIN
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 268 THEN
  RAISE EXCEPTION 'FAIL: expected exactly 268 total ledger rows after candidate';
 END IF;
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='20261124234000' AND name='revoke_postgres_global_public_function_execute') <> 1 THEN
  RAISE EXCEPTION 'FAIL: exact candidate ledger row is not present exactly once';
 END IF;
 IF EXISTS (WITH expected(version,name) AS (VALUES
${vals}
 ) SELECT 1 FROM (
  (SELECT version,name FROM expected EXCEPT SELECT version,name FROM supabase_migrations.schema_migrations WHERE version <> '20261124234000')
  UNION ALL
  (SELECT version,name FROM supabase_migrations.schema_migrations WHERE version <> '20261124234000' EXCEPT SELECT version,name FROM expected)
 ) delta) THEN
  RAISE EXCEPTION 'FAIL: one or more historical version/name pairs changed during the transaction';
 END IF;
END
$ledger_post_guard$;`;
  const transaction=["BEGIN;","SELECT pg_advisory_xact_lock(hashtext('bethag-live-ledger-acl-267-to-268'));",
    exactLedgerGuard,preflight,sql,
    "INSERT INTO supabase_migrations.schema_migrations(version,name,statements,created_by,idempotency_key) VALUES ("+
    lit("20261124234000")+","+lit("revoke_postgres_global_public_function_execute")+
    ",ARRAY[$bethag_live_acl_candidate$"+sql+"$bethag_live_acl_candidate$],"+
    lit("bethag-live-ledger-acl-production-runner")+",NULL);",
    exactLedgerPostGuard,postflight,"COMMIT;",""].join("\n");

  const env={...process.env,PGHOST:db.hostname,PGPORT:db.port||"5432",
    PGDATABASE:decodeURIComponent(db.pathname.slice(1)),PGUSER:decodeURIComponent(db.username)};
  for(const [param,key] of [["sslmode","PGSSLMODE"],["application_name","PGAPPNAME"],
    ["connect_timeout","PGCONNECT_TIMEOUT"],["options","PGOPTIONS"],["target_session_attrs","PGTARGETSESSIONATTRS"]]){
    if(db.searchParams.has(param))env[key]=db.searchParams.get(param);
  }
  const password=decodeURIComponent(db.password);let passDir=null,tmpDir=null;
  try{
    if(password){passDir=await mkdtemp(join(tmpdir(),"bethag-live-production-pgpass-"));
      const pass=join(passDir,"pgpass");
      await writeFile(pass,[env.PGHOST,env.PGPORT,env.PGDATABASE,env.PGUSER,password].map(passEscape).join(":")+"\n",{mode:0o600});
      await chmod(pass,0o600);env.PGPASSFILE=pass;}
    assert.ok(password||env.PGPASSFILE,"STOP: provide a password-bearing DATABASE_URL or a protected PGPASSFILE; PGPASSWORD is not forwarded.");
    delete env.DATABASE_URL;delete env.PGPASSWORD;
    tmpDir=await mkdtemp(join(tmpdir(),"bethag-live-production-cutover-"));
    const file=join(tmpDir,"forward-only.sql");await writeFile(file,transaction,{mode:0o600});
    const child=spawn(process.env.BETHAG_PSQL_BIN||"psql",["-X","--no-psqlrc","-v","ON_ERROR_STOP=1","-f",file],{env,stdio:["ignore","pipe","pipe"]});
    let out="",err="";
    await new Promise((resolve,reject)=>{
      child.stdout.setEncoding("utf8").on("data",x=>out+=x);
      child.stderr.setEncoding("utf8").on("data",x=>err+=x);
      child.on("error",reject);child.on("close",code=>code===0?resolve():reject(new Error("Production transaction failed: "+(err||out))));
    });
    const notices=err+out;
    console.log(JSON.stringify({status:"PASS",mode:"OWNER_APPROVED_PRODUCTION_FORWARD_ONLY",
      project_ref:projectRef,execution_commit_sha:expected,approved_source_commit_sha:approvedSource,release_fingerprint:fingerprint,
      historical_rows_preserved:267,canonical_rows_added:1,final_ledger_rows:268,
      final_ledger_head:"20261124234000",candidate_git_blob_sha:item.git_blob_sha,
      preflight_notice_observed:/PREFLIGHT PASS/.test(notices),postflight_notice_observed:/POSTFLIGHT PASS/.test(notices)},null,2));
  }finally{
    if(tmpDir)await rm(tmpDir,{recursive:true,force:true});
    if(passDir)await rm(passDir,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e?.message||String(e));process.exitCode=1;});
