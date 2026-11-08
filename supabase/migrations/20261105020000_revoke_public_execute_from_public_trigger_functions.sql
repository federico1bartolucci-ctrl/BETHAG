-- Forward-only least-privilege repair for the two public trigger functions.
-- Trigger execution does not require callers to hold EXECUTE.
-- Keep owner and service_role access; remove PUBLIC/anon/authenticated direct execution.
DO $precheck$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'normalize_zero_ownership_owner'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      AND p.prorettype = 'trigger'::regtype
      AND NOT p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Unexpected normalize_zero_ownership_owner definition';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'preserve_closing_condominium_member_history'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      AND p.prorettype = 'trigger'::regtype
      AND NOT p.prosecdef
  ) THEN
    RAISE EXCEPTION 'Unexpected preserve_closing_condominium_member_history definition';
  END IF;
END;
$precheck$;

REVOKE EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() FROM PUBLIC, anon, authenticated;

DO $verify$
DECLARE
  v_oid oid;
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'public.normalize_zero_ownership_owner()',
    'public.preserve_closing_condominium_member_history()'
  ] LOOP
    v_oid := pg_catalog.to_regprocedure(v_name);
    IF v_oid IS NULL THEN RAISE EXCEPTION 'Missing trigger function %', v_name; END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(
        COALESCE((SELECT proacl FROM pg_proc WHERE oid = v_oid), acldefault('f', (SELECT proowner FROM pg_proc WHERE oid = v_oid)))
      ) a
      WHERE a.grantee IN (0, 'anon'::regrole, 'authenticated'::regrole)
        AND a.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'PUBLIC/anon/authenticated EXECUTE remains on %', v_name;
    END IF;
    IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role EXECUTE was not preserved on %', v_name;
    END IF;
    IF NOT has_function_privilege('postgres', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Owner EXECUTE was not preserved on %', v_name;
    END IF;
  END LOOP;
END;
$verify$;
