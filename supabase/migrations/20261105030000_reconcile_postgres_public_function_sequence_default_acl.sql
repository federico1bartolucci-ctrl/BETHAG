-- Least-privilege defaults for future postgres-owned functions and sequences in public.
-- Application/backend access must be granted explicitly per object when required.
-- Existing functions, sequences, ownership, current ACLs and Supabase-managed owners are untouched.
DO $precheck$
DECLARE v_global_count integer;
BEGIN
  SELECT count(*) INTO v_global_count
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole = 'postgres'::regrole
    AND d.defaclnamespace = 0
    AND d.defaclobjtype IN ('f','S')
    AND a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole);
  IF v_global_count <> 0 THEN
    RAISE EXCEPTION 'Unexpected global postgres function/sequence defaults for application roles: %', v_global_count;
  END IF;
END;
$precheck$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

DO $verify$
DECLARE v_remaining integer; v_global_count integer;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole = 'postgres'::regrole
    AND d.defaclnamespace = 'public'::regnamespace
    AND d.defaclobjtype IN ('f','S')
    AND a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole);
  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'Application role default function/sequence privileges remain: %', v_remaining;
  END IF;

  SELECT count(*) INTO v_global_count
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole = 'postgres'::regrole
    AND d.defaclnamespace = 0
    AND d.defaclobjtype IN ('f','S')
    AND a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole);
  IF v_global_count <> 0 THEN
    RAISE EXCEPTION 'Global application role defaults unexpectedly present: %', v_global_count;
  END IF;
END;
$verify$;
