import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function psql(args) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

const fixture = `
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END;
$roles$;

CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO service_role;

CREATE VIEW public.condominium_fund_availability AS SELECT 1::integer AS available;
GRANT ALL PRIVILEGES ON TABLE public.condominium_fund_availability TO authenticated;

CREATE FUNCTION private.check_condominium_member_transfer_closure(uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS 'SELECT true';
CREATE FUNCTION public.check_condominium_member_transfer_closure(uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public AS 'SELECT true';
`;

psql(["-v", "ON_ERROR_STOP=1", "-c", fixture]);
psql(["-v", "ON_ERROR_STOP=1", "-f", "supabase/rebuild/drafts/20261104150000_reconcile_production_acl_least_privilege.sql"]);

const query = `
SELECT json_build_object(
 'view_select', has_table_privilege('authenticated','public.condominium_fund_availability','SELECT'),
 'view_insert', has_table_privilege('authenticated','public.condominium_fund_availability','INSERT'),
 'view_update', has_table_privilege('authenticated','public.condominium_fund_availability','UPDATE'),
 'view_delete', has_table_privilege('authenticated','public.condominium_fund_availability','DELETE'),
 'view_truncate', has_table_privilege('authenticated','public.condominium_fund_availability','TRUNCATE'),
 'view_references', has_table_privilege('authenticated','public.condominium_fund_availability','REFERENCES'),
 'view_trigger', has_table_privilege('authenticated','public.condominium_fund_availability','TRIGGER'),
 'view_maintain', has_table_privilege('authenticated','public.condominium_fund_availability','MAINTAIN'),
 'anon_private_execute', has_function_privilege('anon','private.check_condominium_member_transfer_closure(uuid)','EXECUTE'),
 'anon_public_execute', has_function_privilege('anon','public.check_condominium_member_transfer_closure(uuid)','EXECUTE'),
 'anon_default_dml', EXISTS (
   SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
   WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
     AND d.defaclobjtype='r' AND a.grantee='anon'::regrole
     AND a.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
 ),
 'auth_default_structural', EXISTS (
   SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
   WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
     AND d.defaclobjtype='r' AND a.grantee='authenticated'::regrole
     AND a.privilege_type IN ('MAINTAIN','TRUNCATE','REFERENCES','TRIGGER')
 ),
 'service_default_maintain', EXISTS (
   SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
   WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
     AND d.defaclobjtype='r' AND a.grantee='service_role'::regrole
     AND a.privilege_type='MAINTAIN'
 )
)::text;`;
const result = JSON.parse(psql(["-A","-t","-c",query]).trim());
assert.deepEqual(result, {
  view_select: true,
  view_insert: false,
  view_update: false,
  view_delete: false,
  view_truncate: false,
  view_references: false,
  view_trigger: false,
  view_maintain: false,
  anon_private_execute: false,
  anon_public_execute: false,
  anon_default_dml: false,
  auth_default_structural: false,
  service_default_maintain: false,
});
console.log(JSON.stringify({production_acl_draft:"PASS", postgres:"17", assertions:result}, null, 2));
