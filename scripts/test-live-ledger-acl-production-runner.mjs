#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const runner=await readFile("scripts/apply-live-ledger-acl-production.mjs","utf8");
const approvalGuard=await readFile("scripts/lib/live-ledger-acl-approval-guard.mjs","utf8");
const manifest=JSON.parse(await readFile("supabase/rebuild/drafts/production-migration-cutover-live-20261124.json","utf8"));
const snapshot=JSON.parse(await readFile("supabase/rebuild/drafts/production-ledger-live-20261124.json","utf8"));
const preflight=await readFile("supabase/rebuild/drafts/production-cutover-preflight-live-20261124.sql","utf8");
const postflight=await readFile("supabase/rebuild/drafts/production-cutover-postflight-live-20261124.sql","utf8");
assert.equal(manifest.status,"DRAFT_NOT_APPROVED");
assert.equal(manifest.approval_scope,"NONE");
assert.equal(manifest.production_apply_authorized,false);
assert.equal(snapshot.count,267);
assert.equal(snapshot.migrations.length,267);
assert.equal(snapshot.head.version,"20261105050000");
for(const pattern of [/BETHAG_LIVE_LEDGER_PRODUCTION_APPLY/,/BETHAG_ALLOW_LIVE_LEDGER_PRODUCTION/,
 /approved_release_fingerprint/,/approved_window_start_utc/,/approved_window_end_utc/,
 /approved_target_project_ref/,/EXCEPT SELECT version,name FROM supabase_migrations\.schema_migrations/,
 /pg_advisory_xact_lock/,/BEGIN;/,/COMMIT;/,/PGPASSFILE/,/delete env\.DATABASE_URL/,/delete env\.PGPASSWORD/])assert.match(runner,pattern);
assert.match(runner,/assertLiveLedgerAclEvidenceMatchesSource/);
assert.match(runner,/computeLiveLedgerAclReleaseFingerprint/,
  "Production runner must use the shared, independently invocable release fingerprint implementation.");
assert.doesNotMatch(runner,/BETHAG_PSQL_BIN/,
  "Production runner must not allow an environment override of the psql executable.");
assert.match(runner,/spawn\("psql",/,
  "Production runner must invoke the fixed psql executable.");
assert.match(runner,/sslmode/);
assert.match(runner,/Production PostgreSQL connections must require TLS/);
assert.match(runner,/ci_tested_commit_sha/);
assert.match(runner,/ci_build_status/);
assert.match(runner,/ci_baseline_safety_status/);
assert.match(runner,/postgres17_rehearsal_status/);
assert.match(runner,/qa_final_workflow_status/);
assert.match(runner,/full_clean_install/);
assert.match(runner,/guarded_runner/);
assert.match(runner,/global_function_default_acl_regression/);
assert.match(runner,/PREFLIGHT PASS/);
assert.match(runner,/POSTFLIGHT PASS/);
assert.match(runner,/exactLedgerPostGuard/);
assert.match(runner,/historical version\/name pairs changed during the transaction/);
assert.match(approvalGuard,/qa_tested_commit_sha/);
assert.match(approvalGuard,/reviewed_commit_sha/);
assert.match(approvalGuard,/INTERNAL_SELF_REVIEW/);
assert.match(approvalGuard,/conflict_disclosed/);
assert.match(runner,/PASS_WITH_DISCLOSED_CONFLICT/);
assert.match(runner,/INTERNAL_SELF_REVIEW/);
assert.match(runner,/conflict_disclosed/);
assert.doesNotMatch(runner,/independent_technical_review/);
assert.doesNotMatch(runner,/\bapply_migration\s*\(/i);
assert.doesNotMatch(runner,/\b(?:DELETE|UPDATE)\s+FROM\s+supabase_migrations\.schema_migrations/i);
assert.doesNotMatch(runner,/DROP\s+TABLE\s+supabase_migrations\.schema_migrations/i);
const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const worktree=await mkdtemp(join(tmpdir(),"bethag-live-ledger-runner-gate-"));
try{
 execFileSync("git",["worktree","add","--detach",worktree,sha],{stdio:"pipe"});
 const result=spawnSync(process.execPath,["scripts/apply-live-ledger-acl-production.mjs"],{cwd:worktree,encoding:"utf8",timeout:10000,env:{
  ...process.env,DATABASE_URL:"postgresql://postgres@db.tctcgptrsmvgajqjgnev.supabase.co:5432/postgres",
  BETHAG_LIVE_LEDGER_PRODUCTION_APPLY:"YES",BETHAG_ALLOW_LIVE_LEDGER_PRODUCTION:"YES",
  BETHAG_PRODUCTION_PROJECT_REF:"tctcgptrsmvgajqjgnev",BETHAG_EXPECTED_COMMIT_SHA:sha,
  BETHAG_APPROVED_SOURCE_COMMIT_SHA:sha}});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/not explicitly approved for Production cutover/);
 assert.doesNotMatch(result.stderr,/ECONNREFUSED|ENOTFOUND|timeout expired|could not translate host name/i);
}finally{
 try{execFileSync("git",["worktree","remove","--force",worktree],{stdio:"pipe"});}catch{}
 await rm(worktree,{recursive:true,force:true});
}

assert.equal(manifest.clean_install?.migration_file_count,28,
  "Canonical Supabase CLI inventory must remain at 28 while the live proposal is unapproved.");
assert.equal(manifest.rehearsal_evidence?.candidate_draft_rehearsal,"PASS",
  "Separate PostgreSQL 17 rehearsal of the draft candidate is required.");
assert.match(runner,/candidatePath=join\(root,"supabase\/rebuild\/drafts",candidate\)/,
  "Production runner must read the candidate from the non-deployable drafts directory.");
assert.doesNotMatch(runner,/candidatePath=join\(root,"supabase\/migrations",candidate\)/,
  "Production runner must not make the unapproved candidate part of the standard CLI inventory.");

console.log(JSON.stringify({status:"PASS",production_apply:"BLOCKED_WITHOUT_EXPLICIT_OWNER_APPROVAL",
 blocked_before_connection:true,pinned_ledger_rows:267,no_production_or_qa_writes:true},null,2));
