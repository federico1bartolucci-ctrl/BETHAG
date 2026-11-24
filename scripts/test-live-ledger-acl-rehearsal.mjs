#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const databaseUrl=process.env.DATABASE_URL||"";
const target=new URL(databaseUrl);
assert.ok(["localhost","127.0.0.1","::1"].includes(target.hostname),"Only disposable local PostgreSQL is permitted.");
const snapshot=JSON.parse(await readFile("supabase/rebuild/drafts/production-ledger-live-20261124.json","utf8"));
function psql(sql){execFileSync("psql",["-X","--no-psqlrc","--dbname",databaseUrl,"-v","ON_ERROR_STOP=1","-c",sql],{stdio:"inherit"});}
psql(`
DO $roles$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $roles$;
CREATE SCHEMA supabase_migrations;
CREATE SCHEMA storage;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
CREATE TABLE supabase_migrations.schema_migrations(
 version text PRIMARY KEY, name text NOT NULL, statements text[] NOT NULL,
 created_by text, idempotency_key text
);
`);
const values=snapshot.migrations.map(x=>"('"+x.version+"','"+x.name.replaceAll("'","''")+"',ARRAY[]::text[],NULL,NULL)").join(",\n");
psql("INSERT INTO supabase_migrations.schema_migrations(version,name,statements,created_by,idempotency_key) VALUES "+values+";");
const child=spawn(process.execPath,["scripts/apply-live-ledger-acl-rehearsal.mjs"],{env:{...process.env,BETHAG_LIVE_LEDGER_REHEARSAL:"YES"},stdio:["ignore","pipe","pipe"]});
let out="",err="";
child.stdout.setEncoding("utf8").on("data",x=>out+=x);
child.stderr.setEncoding("utf8").on("data",x=>err+=x);
const code=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("close",resolve);});
if(code!==0) throw new Error("Proposal runner rehearsal failed: "+err+out);
assert.match(out,/"status": "PASS"/);
console.log(out);
