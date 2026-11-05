-- Forward-only ACL reconciliation for the Production cutover package.
-- Scope is limited to verified application-role grants and postgres-owned defaults.
-- Supabase-managed roles/defaults (including supabase_admin) are intentionally untouched.

DO $view_acl$
DECLARE
  target_kind "char";
BEGIN
  SELECT c.relkind INTO target_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'condominium_fund_availability';

  IF target_kind = 'v' THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.condominium_fund_availability FROM authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.condominium_fund_availability TO authenticated';
  ELSE
    RAISE EXCEPTION 'Expected public.condominium_fund_availability to remain a view; found relkind %', target_kind;
  END IF;
END;
$view_acl$;

REVOKE EXECUTE
  ON FUNCTION private.check_condominium_member_transfer_closure(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE
  ON FUNCTION public.check_condominium_member_transfer_closure(uuid)
  FROM PUBLIC, anon;

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

DO $verify$
BEGIN
  IF NOT has_table_privilege('authenticated','public.condominium_fund_availability','SELECT')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','INSERT')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','UPDATE')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','DELETE')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','TRUNCATE')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','REFERENCES')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','TRIGGER')
     OR has_table_privilege('authenticated','public.condominium_fund_availability','MAINTAIN') THEN
    RAISE EXCEPTION 'ACL reconciliation failed: authenticated must retain SELECT only on condominium_fund_availability';
  END IF;

  IF has_function_privilege('anon','private.check_condominium_member_transfer_closure(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'ACL reconciliation failed: anon can execute private transfer-closure helper';
  END IF;

  IF has_function_privilege('anon','public.check_condominium_member_transfer_closure(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'ACL reconciliation failed: anon can execute public transfer-closure helper';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
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