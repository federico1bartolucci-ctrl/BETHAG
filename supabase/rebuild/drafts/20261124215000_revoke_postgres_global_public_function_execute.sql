-- Forward-only least-privilege repair for postgres-owned future functions.
--
-- The older migration 20261022210630 used a schema-scoped REVOKE in private.
-- PostgreSQL schema-specific default ACLs are additive to global defaults:
-- a per-schema REVOKE cannot cancel the built-in global PUBLIC EXECUTE grant.
-- Revoke the global default once, then keep intentional schema-specific grants
-- (for example storage) additive and unchanged.
--
-- Existing functions and their ACLs are not modified by ALTER DEFAULT PRIVILEGES.
-- Supabase-managed owners (supabase_admin, supabase_auth_admin) are untouched.

DO $precheck$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    RAISE EXCEPTION 'Expected postgres owner role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'private') THEN
    RAISE EXCEPTION 'Expected private schema';
  END IF;
END;
$precheck$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

DO $verify$
DECLARE
  v_global_acl aclitem[];
BEGIN
  SELECT d.defaclacl INTO v_global_acl
  FROM pg_default_acl d
  WHERE d.defaclrole = 'postgres'::regrole
    AND d.defaclnamespace = 0
    AND d.defaclobjtype = 'f';

  IF v_global_acl IS NULL THEN
    RAISE EXCEPTION 'Global postgres function default ACL row is missing; implicit PUBLIC EXECUTE may remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM aclexplode(v_global_acl) a
    WHERE a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Global postgres function defaults still grant EXECUTE to an application role or PUBLIC';
  END IF;
END;
$verify$;
