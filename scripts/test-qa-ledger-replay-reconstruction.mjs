#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must target a disposable local PostgreSQL database.");
const target = new URL(databaseUrl);
assert.ok(["localhost","127.0.0.1","::1"].includes(target.hostname), "Refusing non-local DATABASE_URL.");

function psql(args, input) {
  return execFileSync("psql", ["-X","--no-psqlrc","--dbname",databaseUrl,"-v","ON_ERROR_STOP=1",...args], {
    encoding:"utf8", stdio:["pipe","pipe","inherit"], input
  });
}

const snapshot = JSON.parse(await readFile("supabase/rebuild/qa-ledger-20261104.json","utf8"));
assert.equal(snapshot.count,34);
assert.equal(snapshot.migrations.length,34);
assert.equal(snapshot.branch_status,"MIGRATIONS_FAILED");

const dirs = [
  ["supabase/migrations","canonical"],
  ["supabase/rebuild/qa-only-migrations","archived-qa"],
  ["supabase/rebuild/qa-reconstructed-migrations","catalog-reconstructed"]
];
const candidates = [];
for (const [directory,source] of dirs) {
  for (const filename of (await readdir(directory)).filter(name=>name.endsWith(".sql"))) {
    const match = filename.match(/^(\d{14})_(.+)\.sql$/);
    if (!match) continue;
    candidates.push({version:match[1],name:match[2],file:path.join(directory,filename),source});
  }
}
const selected = snapshot.migrations.map(row=>{
  const matches=candidates.filter(candidate=>candidate.version===row.version && candidate.name===row.name);
  assert.equal(matches.length,1,
    "Expected exactly one source for "+row.version+"_"+row.name+", found "+matches.length);
  return {...matches[0],expectedName:row.name};
});
assert.equal(selected.length,34);
assert.deepEqual(selected.map(x=>x.version),[...selected.map(x=>x.version)].sort());
assert.equal(new Set(selected.map(x=>x.version)).size,34);
const sourceCounts=selected.reduce((acc,row)=>(acc[row.source]=(acc[row.source]??0)+1,acc),{});
assert.deepEqual(sourceCounts,{"canonical":17,"archived-qa":12,"catalog-reconstructed":5});

const baselineGrantSql=await readFile("supabase/migrations/20261017000005_bethag_baseline_grants.sql","utf8");
const roles=new Set(["anon","authenticated","service_role","authenticator","supabase_admin"]);
for(const pattern of [
  /\\bTO\\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
  /\\bFOR\\s+ROLE\\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi
]){
  for(const match of baselineGrantSql.matchAll(pattern)){
    const role=(match[1]??match[2]).replace(/""/g,'"');
    if(!["PUBLIC","public","postgres"].includes(role))roles.add(role);
  }
}
const bootstrap=[
  "CREATE SCHEMA IF NOT EXISTS auth;",
  "CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);",
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
  "CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;",
  "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;",
  ...[...roles].sort().filter(role=>role!=="postgres").map(role=>{
    const ident=role.replace(/"/g,'""'), literal=role.replace(/'/g,"''");
    return "DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='"+literal+"') THEN CREATE ROLE \""+ident+"\" NOLOGIN; END IF; END $role$;";
  })
].join("\n");
psql(["-c",bootstrap]);

for(const row of selected){
  console.log("Applying "+row.version+"_"+row.name+" ["+row.source+"]");
  psql(["-f",row.file]);
}

const checks=JSON.parse(psql(["-A","-t","-c",`
SELECT json_build_object(
 'public_tables',(SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
 'public_rls_tables',(SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity),
 'application_maintain_relations',(SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND (has_table_privilege('anon',c.oid,'MAINTAIN') OR has_table_privilege('authenticated',c.oid,'MAINTAIN') OR has_table_privilege('service_role',c.oid,'MAINTAIN'))),
 'transfer_wrapper_invoker',(SELECT NOT p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='close_condominium_member_transfer' AND pg_get_function_identity_arguments(p.oid)='p_transfer_id uuid'),
 'private_schema_service_role_usage',has_schema_privilege('service_role','private','USAGE'),
 'workspace_members_data',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data' AND data_type='jsonb'),
 'condominium_archive_columns',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='condominiums' AND column_name='archived_at') AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='condominiums' AND column_name='archived_by') AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='condominiums' AND column_name='archive_reason'),
 'portal_access_exists',to_regclass('public.portal_access') IS NOT NULL,
 'incoming_coowner_trigger',EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='condominium_members' AND t.tgname='trg_apply_incoming_transfer_member_metadata' AND NOT t.tgisinternal),
 'communication_prepare_auth',has_function_privilege('authenticated','private.prepare_communication_recipients(uuid)','EXECUTE'),
 'communication_reset_auth',has_function_privilege('authenticated','private.reset_stale_communication_recipients(uuid,interval)','EXECUTE'),
 'resend_event_service_role',has_function_privilege('service_role','private.apply_resend_communication_event(text,text,text,text,timestamptz)','EXECUTE'),
 'resend_event_authenticated',has_function_privilege('authenticated','private.apply_resend_communication_event(text,text,text,text,timestamptz)','EXECUTE'),
 'resend_event_anon',has_function_privilege('anon','private.apply_resend_communication_event(text,text,text,text,timestamptz)','EXECUTE'),
 'workspace_staff_authenticated',has_function_privilege('authenticated','private.is_workspace_staff(uuid)','EXECUTE'),
 'fund_view_service_maintain',has_table_privilege('service_role','public.condominium_fund_availability','MAINTAIN')
)::text;`]));
assert.equal(checks.public_tables,47);
assert.equal(checks.public_rls_tables,47);
assert.equal(checks.application_maintain_relations,0);
assert.equal(checks.transfer_wrapper_invoker,true);
assert.equal(checks.private_schema_service_role_usage,true);
assert.equal(checks.workspace_members_data,true);
assert.equal(checks.condominium_archive_columns,true);
assert.equal(checks.portal_access_exists,true);
assert.equal(checks.incoming_coowner_trigger,true);
assert.equal(checks.communication_prepare_auth,true);
assert.equal(checks.communication_reset_auth,true);
assert.equal(checks.resend_event_service_role,true);
assert.equal(checks.resend_event_authenticated,false);
assert.equal(checks.resend_event_anon,false);
assert.equal(checks.workspace_staff_authenticated,false);
assert.equal(checks.fund_view_service_maintain,false);

console.log(JSON.stringify({
 status:"PASS",
 target:"disposable local PostgreSQL 17",
 qa_ledger_rows_replayed:selected.length,
 source_counts:sourceCounts,
 reconstructed_sources_are_explicitly_labelled:true,
 postconditions:checks,
 production_or_live_qa_touched:false
},null,2));
