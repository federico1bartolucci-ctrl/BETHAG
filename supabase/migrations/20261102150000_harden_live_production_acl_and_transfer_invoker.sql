-- Forward-only production hardening for the live 244-entry migration history.
-- This migration intentionally does not rewrite, delete, or baseline existing
-- migration history. It removes PostgreSQL 17 MAINTAIN from application roles,
-- prevents it from being granted to future public-schema tables, and restores
-- the intended SECURITY INVOKER public member-transfer wrapper.
--
-- Supabase-managed supabase_admin defaults and the storage schema are untouched.
-- The private implementation remains SECURITY DEFINER and independently checks
-- auth.uid(), workspace membership, condominium-management permission and
-- financial closure invariants before mutating transfer/member state.

BEGIN;

-- Remove current MAINTAIN privileges from all existing public relations,
-- including tables, partitioned tables, views and materialized views.
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated, service_role;

-- Prevent future postgres-owned public tables from inheriting MAINTAIN.
-- Keep postgres' own administrative privileges unchanged.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated, service_role;

-- The public RPC must execute with caller privileges. The private implementation
-- is SECURITY DEFINER and performs the authorization checks described above.
ALTER FUNCTION public.close_condominium_member_transfer(uuid) SECURITY INVOKER;

-- An invoker wrapper needs explicit access to its private implementation.
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid)
  TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid)
  FROM PUBLIC, anon;

-- Fail the migration transaction if any intended postcondition is not met.
DO $verification$
DECLARE
  v_maintain_count integer;
  v_default_maintain_count integer;
  v_wrapper_security_definer boolean;
BEGIN
  SELECT count(*) INTO v_maintain_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm')
    AND (
      has_table_privilege('anon', c.oid, 'MAINTAIN')
      OR has_table_privilege('authenticated', c.oid, 'MAINTAIN')
      OR has_table_privilege('service_role', c.oid, 'MAINTAIN')
    );

  SELECT count(*) INTO v_default_maintain_count
  FROM pg_default_acl d
  JOIN pg_namespace n ON n.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole = 'postgres'::regrole
    AND d.defaclobjtype = 'r'
    AND n.nspname = 'public'
    AND a.privilege_type = 'MAINTAIN'
    AND a.grantee IN (
      'anon'::regrole,
      'authenticated'::regrole,
      'service_role'::regrole
    );

  SELECT p.prosecdef INTO v_wrapper_security_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'close_condominium_member_transfer'
    AND pg_get_function_identity_arguments(p.oid) = 'p_transfer_id uuid';

  IF v_maintain_count <> 0 THEN
    RAISE EXCEPTION 'APP-14: unexpected MAINTAIN grants remain on public relations (%)', v_maintain_count;
  END IF;
  IF v_default_maintain_count <> 0 THEN
    RAISE EXCEPTION 'APP-14: unexpected public default MAINTAIN grants remain (%)', v_default_maintain_count;
  END IF;
  IF v_wrapper_security_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'APP-14: public transfer wrapper is not SECURITY INVOKER';
  END IF;
  IF NOT has_schema_privilege('service_role', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'APP-14: service_role lacks USAGE on private schema';
  END IF;
  IF NOT has_function_privilege('authenticated', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'APP-14: intended private transfer EXECUTE grants are missing';
  END IF;
  IF has_function_privilege('anon', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE')
     OR has_function_privilege('public', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'APP-14: private transfer implementation is executable by PUBLIC or anon';
  END IF;
END;
$verification$;

COMMIT;
