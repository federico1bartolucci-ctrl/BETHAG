-- Correct PostgreSQL's global defaults for functions created by postgres.
--
-- The schema-scoped REVOKE in 20261022210630 cannot cancel PostgreSQL's
-- built-in global PUBLIC EXECUTE default: schema-specific defaults are
-- additive. Revoke the global default so future postgres-owned functions do
-- not become executable by PUBLIC or application roles unless an intentional
-- schema-specific GRANT is configured.
--
-- This affects future functions only. Existing function ACLs are unchanged.
-- Defaults belonging to Supabase-managed roles are not modified.

DO $precheck$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    RAISE EXCEPTION 'Expected postgres owner role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Expected Supabase application roles';
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
    RAISE EXCEPTION 'Global postgres function default ACL row is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM aclexplode(v_global_acl) a
    WHERE a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Global postgres function defaults still grant EXECUTE to PUBLIC or an application role';
  END IF;
END;
$verify$;
