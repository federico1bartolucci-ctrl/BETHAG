-- Forward-only ACL reconciliation for the Production cutover package.
-- Scope is limited to verified application-role grants and postgres-owned defaults.
-- Supabase-managed roles/defaults (including supabase_admin) are intentionally untouched.
-- Apply only after reviewing the live ACL inventory and obtaining cutover approval.

-- Existing view ACL: authenticated requires ordinary read access only.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.condominium_fund_availability
  FROM authenticated;

-- Remove direct client execution of the transfer-closure helper.
-- The public wrapper remains available only to explicitly authorized callers
-- according to its separately managed RPC grant.
REVOKE EXECUTE
  ON FUNCTION private.check_condominium_member_transfer_closure(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE
  ON FUNCTION public.check_condominium_member_transfer_closure(uuid)
  FROM PUBLIC, anon;

-- PostgreSQL default ACLs are additive: reconcile both global and public-schema
-- defaults for objects created by postgres. Do not change platform-owned defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE MAINTAIN ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM service_role;

-- Fail closed if any targeted effective privilege remains.
DO $verify$
BEGIN
  IF has_table_privilege(
    'authenticated',
    'public.condominium_fund_availability',
    'TRUNCATE'
  ) OR has_table_privilege(
    'authenticated',
    'public.condominium_fund_availability',
    'REFERENCES'
  ) OR has_table_privilege(
    'authenticated',
    'public.condominium_fund_availability',
    'TRIGGER'
  ) THEN
    RAISE EXCEPTION 'ACL reconciliation failed: authenticated retains structural privileges on condominium_fund_availability';
  END IF;

  IF has_function_privilege(
    'anon',
    'private.check_condominium_member_transfer_closure(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'ACL reconciliation failed: anon can execute private transfer-closure helper';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.check_condominium_member_transfer_closure(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'ACL reconciliation failed: anon can execute public transfer-closure helper';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclobjtype = 'r'
      AND (d.defaclnamespace = 0 OR n.nspname = 'public')
      AND (
        (a.grantee = 'anon'::regrole AND a.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'))
        OR (a.grantee = 'authenticated'::regrole AND a.privilege_type IN ('MAINTAIN','TRUNCATE','REFERENCES','TRIGGER'))
        OR (a.grantee = 'service_role'::regrole AND a.privilege_type = 'MAINTAIN')
      )
  ) THEN
    RAISE EXCEPTION 'ACL reconciliation failed: prohibited postgres default table privileges remain';
  END IF;
END;
$verify$;
