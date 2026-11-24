#!/usr/bin/env node
/**
 * Proposal-specific ledger runner. Intentionally LOCAL-REHEARSAL ONLY.
 * Production execution remains disabled until a separate owner-approved runner
 * and exact live preflight are reviewed. This file cannot target Supabase.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const rehearsal = process.env.BETHAG_LIVE_LEDGER_REHEARSAL === "YES";
assert.equal(rehearsal, true, "STOP: proposal runner is rehearsal-only; Production execution is not implemented or authorized.");
const databaseUrl = process.env.DATABASE_URL || "";
let target;
try { target = new URL(databaseUrl); } catch { throw new Error("STOP: DATABASE_URL must identify an isolated local PostgreSQL database."); }
assert.ok(["localhost","127.0.0.1","::1"].includes(target.hostname), "STOP: only loopback PostgreSQL is permitted.");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev/i.test(databaseUrl), "STOP: Supabase/Production targets are forbidden.");

const manifest = JSON.parse(await readFile(join(root,"supabase/rebuild/drafts/production-migration-cutover-live-20261124.json"),"utf8"));
const snapshot = JSON.parse(await readFile(join(root,"supabase/rebuild/drafts/production-ledger-live-20261124.json"),"utf8"));
const item = manifest.sequence?.[0];
assert.equal(manifest.status,"DRAFT_NOT_APPROVED");
assert.equal(manifest.production_apply_authorized,false);
assert.equal(snapshot.count,267);
assert.equal(snapshot.migrations.length,267);
assert.equal(snapshot.head.version,"20261105050000");
assert.equal(item.file,"20261124234000_revoke_postgres_global_public_function_execute.sql");
assert.equal(item.git_blob_sha,"499ea493e828243309ee2f4bb9c3242d2fbeb862");

const sql = await readFile(join(root,"supabase/rebuild/drafts/"+item.file),"utf8");
const bytes=Buffer.from(sql.replace(/\r\n/g,"\n"),"utf8");
const blobSha=createHash("sha1").update(Buffer.concat([Buffer.from("blob "+bytes.length+"\0"),bytes])).digest("hex");
assert.equal(blobSha,item.git_blob_sha,"Candidate SQL hash mismatch.");

function psql(args,input) {
  return new Promise((resolve,reject)=>{
    const child=spawn("psql",["-X","--no-psqlrc","--dbname",databaseUrl,"-v","ON_ERROR_STOP=1",...args],{env:process.env,stdio:[input===undefined?"ignore":"pipe","pipe","pipe"]});
    let out="",err="";
    child.stdout.setEncoding("utf8").on("data",x=>out+=x);
    child.stderr.setEncoding("utf8").on("data",x=>err+=x);
    child.on("error",reject);
    child.on("close",code=>code===0?resolve(out.trim()):reject(new Error(err||out||"psql failed "+code)));
    if(input!==undefined) child.stdin.end(input);
  });
}
const ledger=JSON.parse(await psql(["-At","-c","SELECT COALESCE(json_agg(json_build_object('version',version,'name',name) ORDER BY version),'[]'::json)::text FROM supabase_migrations.schema_migrations;"]));
assert.deepEqual(ledger,snapshot.migrations,"Local rehearsal ledger differs from the exact 267-pair live snapshot.");
const migrationVersion=item.file.slice(0,14), migrationName=item.file.slice(15,-4);
assert.ok(!ledger.some(x=>x.version===migrationVersion||x.name===migrationName),"Candidate already present in rehearsal ledger.");
const temp=await mkdtemp(join(tmpdir(),"bethag-live-ledger-rehearsal-"));
try {
 const wrapped=["BEGIN;","SELECT pg_advisory_xact_lock(hashtext('bethag-live-ledger-acl-rehearsal'));",sql,
   "INSERT INTO supabase_migrations.schema_migrations(version,name,statements,created_by,idempotency_key) VALUES ("+
   "'"+migrationVersion+"','"+migrationName+"',ARRAY[$bethag_candidate$"+sql+"$bethag_candidate$],'bethag-local-rehearsal',NULL);",
   "COMMIT;",""].join("\n");
 const file=join(temp,"candidate.sql");
 await writeFile(file,wrapped,{mode:0o600});
 await psql(["-f",file]);
 const after=JSON.parse(await psql(["-At","-c","SELECT COALESCE(json_agg(json_build_object('version',version,'name',name) ORDER BY version),'[]'::json)::text FROM supabase_migrations.schema_migrations;"]));
 assert.equal(after.length,268);
 assert.deepEqual(after.slice(0,267),snapshot.migrations);
 assert.deepEqual(after.at(-1),{version:migrationVersion,name:migrationName});
 const acl=await psql(["-At","-c","SELECT COALESCE(array_agg(a.grantee::text||':'||a.privilege_type),'{}') FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace=0 AND d.defaclobjtype='f' AND a.privilege_type='EXECUTE' AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole);"]);
 assert.equal(acl,"{}","Global postgres function EXECUTE defaults remain.");
 console.log(JSON.stringify({status:"PASS",mode:"LOCAL_REHEARSAL_ONLY",historical_rows_preserved:267,rows_added:1,final_ledger_rows:268,final_head:after.at(-1),candidate_hash:blobSha,production_or_qa_touched:false},null,2));
} finally { await rm(temp,{recursive:true,force:true}); }
