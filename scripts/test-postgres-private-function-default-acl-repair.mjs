import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL required");
const target = new URL(url);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only disposable local PostgreSQL is allowed");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(url), "Remote Supabase URL refused");

const migration = await readFile(
  "supabase/rebuild/drafts/20261124215000_revoke_postgres_global_public_function_execute.sql",
  "utf8"
);
const setup = `BEGIN;
DO $roles$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $roles$;
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS storage;

-- Reproduce Supabase's intentional schema-specific grants and a managed-owner
-- default ACL that must remain untouched by the postgres-only repair.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

CREATE TEMP TABLE supabase_admin_defaults_before AS
  SELECT defaclacl::text AS acl
  FROM pg_default_acl
  WHERE defaclrole='supabase_admin'::regrole
    AND defaclnamespace='public'::regnamespace
    AND defaclobjtype='f';

-- With PostgreSQL's built-in defaults, new postgres-owned private functions
-- inherit PUBLIC EXECUTE. This proves the old schema-scoped REVOKE was not
-- sufficient to cancel the global default.
CREATE FUNCTION private.before_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION public.before_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION storage.before_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1';

DO $before$
BEGIN
  IF NOT has_function_privilege('anon','private.before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Expected built-in PUBLIC EXECUTE before the global repair';
  END IF;
  IF NOT has_function_privilege('anon','public.before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Expected built-in PUBLIC EXECUTE on public before the repair';
  END IF;
  IF NOT has_function_privilege('anon','storage.before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Expected explicit storage schema default grant';
  END IF;
END $before$;`;

const verify = `
CREATE FUNCTION private.after_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION public.after_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION storage.after_probe() RETURNS integer LANGUAGE sql AS 'SELECT 1';

DO $assert$
DECLARE
  v_oid oid;
  v_before text;
  v_after text;
BEGIN
  v_oid := 'private.after_probe()'::regprocedure;
  IF has_function_privilege('anon',v_oid,'EXECUTE')
     OR has_function_privilege('authenticated',v_oid,'EXECUTE')
     OR has_function_privilege('service_role',v_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'New private function inherited an application EXECUTE privilege';
  END IF;
  IF NOT has_function_privilege('postgres',v_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'Function owner lost EXECUTE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid=v_oid)) a
    WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'New private function still has PUBLIC EXECUTE';
  END IF;

  IF has_function_privilege('anon','public.after_probe()','EXECUTE')
     OR has_function_privilege('authenticated','public.after_probe()','EXECUTE')
     OR has_function_privilege('service_role','public.after_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'New public function inherited an application EXECUTE privilege';
  END IF;

  IF NOT has_function_privilege('anon','storage.after_probe()','EXECUTE')
     OR NOT has_function_privilege('authenticated','storage.after_probe()','EXECUTE')
     OR NOT has_function_privilege('service_role','storage.after_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Intentional schema-specific storage EXECUTE defaults were not preserved';
  END IF;

  -- ALTER DEFAULT PRIVILEGES is prospective: existing ACLs remain unchanged.
  IF NOT has_function_privilege('anon','private.before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Existing private function ACL was unexpectedly rewritten';
  END IF;

  SELECT acl INTO v_before FROM supabase_admin_defaults_before;
  SELECT defaclacl::text INTO v_after FROM pg_default_acl
  WHERE defaclrole='supabase_admin'::regrole
    AND defaclnamespace='public'::regnamespace
    AND defaclobjtype='f';
  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'Supabase-managed supabase_admin defaults changed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_default_acl d
    WHERE d.defaclrole='postgres'::regrole
      AND d.defaclnamespace=0
      AND d.defaclobjtype='f'
  ) THEN
    RAISE EXCEPTION 'Global postgres function default ACL row was not created';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole
      AND d.defaclnamespace=0
      AND d.defaclobjtype='f'
      AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
      AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Global postgres function defaults still grant application EXECUTE';
  END IF;
END $assert$;
ROLLBACK;`;

execFileSync("psql", [
  "-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1",
  "-c", setup + "\n" + migration + "\n" + migration + "\n" + verify
], { stdio: "inherit" });

console.log(JSON.stringify({
  status: "PASS",
  postgres: 17,
  scenario: "Postgres global PUBLIC EXECUTE default and schema-specific additive grants",
  private_new_functions: "owner-only",
  public_new_functions: "no application EXECUTE",
  storage_schema_defaults: "preserved",
  existing_function_acls: "unchanged",
  supabase_admin_defaults: "unchanged",
  idempotency: "draft applied twice",
  transaction: "rolled back",
  remote_databases_touched: false
}, null, 2));
