import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const directory = "supabase/migrations";
const incrementalMigrations = [
  "20261022202747_harden_close_member_transfer_search_path.sql",
  "20261022210629_restrict_private_function_public_execute.sql",
  "20261022210630_harden_default_privileges_and_private_execute.sql",
  "20261022213544_restrict_close_member_transfer_execute.sql",
  "20261022233440_align_public_function_execute.sql",
  "20261023000001_revoke_authenticated_maintain.sql",
  "20261023000002_revoke_default_maintain.sql",
  "20261023000003_revoke_service_role_maintain.sql",
  "20261023000004_application_default_table_privileges.sql",
  "20261023000733_use_invoker_for_close_transfer_rpc.sql",
  "20261027100000_revoke_public_execute_from_transfer_closure_helpers.sql",
  "20261027110000_repair_service_role_transfer_invoker_path.sql",
  "20261028100000_fix_collaborator_module_permission_boolean.sql",
];
const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
assert.ok(actualFiles.includes(incrementalMigrations.at(-1)), "Missing the latest helper ACL correction.");

function psql(args) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

for (const filename of incrementalMigrations) {
  console.log("Applying " + filename + " to isolated PostgreSQL 17...");
  psql(["-f", path.join(directory, filename)]);
}

const query = `
SELECT json_build_object(
  'public_table_relations', (
    SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
  ),
  'authenticated_crud', json_build_object(
    'select', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'SELECT')),
    'insert', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'INSERT')),
    'update', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'UPDATE')),
    'delete', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'DELETE'))
  ),
  'authenticated_maintain', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'MAINTAIN')),
  'service_role_maintain', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'MAINTAIN')),
  'authenticated_structural', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (has_table_privilege('authenticated',c.oid,'TRUNCATE') OR has_table_privilege('authenticated',c.oid,'REFERENCES') OR has_table_privilege('authenticated',c.oid,'TRIGGER'))),
  'default_maintain_grants', (
    SELECT count(*)::int FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='r'
      AND (d.defaclnamespace=0 OR d.defaclnamespace='public'::regnamespace)
      AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
      AND a.privilege_type='MAINTAIN'
  ),
  'private_schema_usage', json_build_object('authenticated',has_schema_privilege('authenticated','private','USAGE'),'service_role',has_schema_privilege('service_role','private','USAGE'),'anon',has_schema_privilege('anon','private','USAGE')),
  'close_rpc', (
    SELECT json_build_object(
      'security_definer', p.prosecdef,
      'public_execute', EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),
      'anon_execute', has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role',p.oid,'EXECUTE')
    )
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='close_condominium_member_transfer'
  ),
  'closure_helpers', (
    SELECT json_agg(json_build_object(
      'signature', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
      'public_execute', EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role',p.oid,'EXECUTE'),
      'anon_execute', has_function_privilege('anon',p.oid,'EXECUTE')
    ) ORDER BY n.nspname,p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proname IN ('check_condominium_member_transfer_closure','close_condominium_member_transfer')
      AND n.nspname IN ('public','private')
  ),
  'public_execute_targets', (
    SELECT COALESCE(array_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)), ARRAY[]::text[])
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE n.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE'
  )
)::text;`;
const result = JSON.parse(psql(["-A","-t","-c",query]).trim());
assert.equal(result.public_table_relations,47);
assert.deepEqual(result.authenticated_crud,{select:47,insert:41,update:41,delete:42},"Production-aligned baseline CRUD grants must remain intact after hardening.");
assert.equal(result.authenticated_maintain,0);
assert.equal(result.service_role_maintain,0);
assert.equal(result.authenticated_structural,0);
assert.equal(result.default_maintain_grants,0);
assert.deepEqual(result.private_schema_usage,{authenticated:true,service_role:true,anon:false});
assert.deepEqual(result.close_rpc,{security_definer:false,public_execute:false,anon_execute:false,authenticated_execute:true,service_role_execute:true});
assert.deepEqual(result.public_execute_targets,[
 "public.normalize_zero_ownership_owner()",
 "public.preserve_closing_condominium_member_history()",
]);
assert.ok(result.closure_helpers.every((fn)=>fn.public_execute===false && fn.authenticated_execute===true && fn.service_role_execute===true && fn.anon_execute===false));
console.log(JSON.stringify({
 incremental_hardening:"PASS",
 postgres:"17",
 applied_incremental_migrations:incrementalMigrations,
 assertions:{
  authenticated_crud_preserved:true,
  authenticated_and_service_role_maintain_removed:true,
  authenticated_structural_privileges_removed:true,
  postgres_default_maintain_removed:true,
  close_rpc_security_invoker_and_authenticated_only:true,
  closure_helpers_not_public_executable:true,
  only_two_intentional_public_trigger_exceptions_remain:true
 },
 result
},null,2));
