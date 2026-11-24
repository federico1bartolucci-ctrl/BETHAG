#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const runner=await readFile("scripts/apply-live-ledger-acl-production.mjs","utf8");
const manifest=JSON.parse(await readFile("supabase/rebuild/drafts/production-migration-cutover-live-20261124.json","utf8"));
const snapshot=JSON.parse(await readFile("supabase/rebuild/drafts/production-ledger-live-20261124.json","utf8"));
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
assert.doesNotMatch(runner,/\bapply_migration\s*\(/i);
assert.doesNotMatch(runner,/\b(?:DELETE|UPDATE)\s+FROM\s+supabase_migrations\.schema_migrations/i);
assert.doesNotMatch(runner,/DROP\s+TABLE\s+supabase_migrations\.schema_migrations/i);
const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const result=spawnSync(process.execPath,["scripts/apply-live-ledger-acl-production.mjs"],{encoding:"utf8",timeout:10000,env:{
 ...process.env,DATABASE_URL:"postgresql://postgres@db.tctcgptrsmvgajqjgnev.supabase.co:5432/postgres",
 BETHAG_LIVE_LEDGER_PRODUCTION_APPLY:"YES",BETHAG_ALLOW_LIVE_LEDGER_PRODUCTION:"YES",
 BETHAG_PRODUCTION_PROJECT_REF:"tctcgptrsmvgajqjgnev",BETHAG_EXPECTED_COMMIT_SHA:sha,
 BETHAG_APPROVED_SOURCE_COMMIT_SHA:sha}});
assert.notEqual(result.status,0);
assert.match(result.stderr,/not explicitly approved for Production cutover/);
assert.doesNotMatch(result.stderr,/ECONNREFUSED|ENOTFOUND|timeout expired|could not translate host name/i);
console.log(JSON.stringify({status:"PASS",production_apply:"BLOCKED_WITHOUT_EXPLICIT_OWNER_APPROVAL",
 blocked_before_connection:true,pinned_ledger_rows:267,no_production_or_qa_writes:true},null,2));
