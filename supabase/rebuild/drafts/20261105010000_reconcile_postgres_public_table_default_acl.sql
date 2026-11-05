-- Forward-only repair for postgres-owned public table default ACL drift.
-- Limited to future TABLE objects created by postgres in public.
-- Existing relation ACLs, function/sequence defaults, ownership, ledger and supabase_admin are untouched.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLES TO service_role;
DO $verify$
DECLARE v_auth text[]; v_service text[]; v_anon integer; v_maintain integer;
BEGIN
 SELECT array_agg(a.privilege_type ORDER BY a.privilege_type) INTO v_auth
 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
 AND d.defaclobjtype='r' AND a.grantee='authenticated'::regrole;
 SELECT array_agg(a.privilege_type ORDER BY a.privilege_type) INTO v_service
 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
 AND d.defaclobjtype='r' AND a.grantee='service_role'::regrole;
 SELECT count(*) INTO v_anon FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
 AND d.defaclobjtype='r' AND a.grantee='anon'::regrole;
 SELECT count(*) INTO v_maintain FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
 AND d.defaclobjtype='r' AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
 AND a.privilege_type='MAINTAIN';
 IF v_auth IS DISTINCT FROM ARRAY['DELETE','INSERT','SELECT','UPDATE']::text[] THEN RAISE EXCEPTION 'authenticated defaults incorrect: %',v_auth; END IF;
 IF v_service IS DISTINCT FROM ARRAY['DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']::text[] THEN RAISE EXCEPTION 'service_role defaults incorrect: %',v_service; END IF;
 IF v_anon<>0 OR v_maintain<>0 THEN RAISE EXCEPTION 'anon/MAINTAIN defaults remain: anon %, maintain %',v_anon,v_maintain; END IF;
END;
$verify$;
