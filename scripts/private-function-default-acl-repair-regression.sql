-- Isolated PostgreSQL regression for global vs schema-specific function defaults.
-- This file is executed only against the disposable local PostgreSQL CI database.
BEGIN;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END;
$roles$;

CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS storage;

-- Schema-specific grants are additive and must survive the global REVOKE.
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

CREATE FUNCTION private.bethag_acl_before_probe() RETURNS integer
LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION public.bethag_acl_before_probe() RETURNS integer
LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION storage.bethag_acl_before_probe() RETURNS integer
LANGUAGE sql AS 'SELECT 1';

DO $before$
BEGIN
  IF NOT has_function_privilege('anon','private.bethag_acl_before_probe()','EXECUTE')
     OR NOT has_function_privilege('anon','public.bethag_acl_before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Expected PostgreSQL built-in global PUBLIC EXECUTE before repair';
  END IF;
  IF NOT has_function_privilege('anon','storage.bethag_acl_before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Expected explicit storage schema-specific grant';
  END IF;
END;
$before$;

\i supabase/rebuild/drafts/20261124215000_revoke_postgres_global_public_function_execute.sql
\i supabase/rebuild/drafts/20261124215000_revoke_postgres_global_public_function_execute.sql

CREATE FUNCTION private.bethag_acl_after_probe() RETURNS integer
LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION public.bethag_acl_after_probe() RETURNS integer
LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION storage.bethag_acl_after_probe() RETURNS integer
LANGUAGE sql AS 'SELECT 1';

DO $verify$
DECLARE
  v_oid oid := 'private.bethag_acl_after_probe()'::regprocedure;
  v_before text;
  v_after text;
BEGIN
  IF has_function_privilege('anon',v_oid,'EXECUTE')
     OR has_function_privilege('authenticated',v_oid,'EXECUTE')
     OR has_function_privilege('service_role',v_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'New private function inherited an application EXECUTE privilege';
  END IF;
  IF NOT has_function_privilege('postgres',v_oid,'EXECUTE') THEN
    RAISE EXCEPTION 'Function owner lost EXECUTE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM aclexplode(
      coalesce((SELECT proacl FROM pg_proc WHERE oid=v_oid),
               acldefault('f',(SELECT proowner FROM pg_proc WHERE oid=v_oid)))
    ) a
    WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'New private function still has PUBLIC EXECUTE';
  END IF;

  IF has_function_privilege('anon','public.bethag_acl_after_probe()','EXECUTE')
     OR has_function_privilege('authenticated','public.bethag_acl_after_probe()','EXECUTE')
     OR has_function_privilege('service_role','public.bethag_acl_after_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'New public function inherited an application EXECUTE privilege';
  END IF;

  IF NOT has_function_privilege('anon','storage.bethag_acl_after_probe()','EXECUTE')
     OR NOT has_function_privilege('authenticated','storage.bethag_acl_after_probe()','EXECUTE')
     OR NOT has_function_privilege('service_role','storage.bethag_acl_after_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Intentional storage schema-specific grants were not preserved';
  END IF;

  -- Default-privilege changes do not rewrite existing function ACLs.
  IF NOT has_function_privilege('anon','private.bethag_acl_before_probe()','EXECUTE') THEN
    RAISE EXCEPTION 'Existing function ACL was unexpectedly rewritten';
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
END;
$verify$;

ROLLBACK;
