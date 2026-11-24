-- Read-only postflight for the single live-ledger ACL migration.
DO $postflight$
DECLARE
  v_count integer;
  v_head text;
  v_global aclitem[];
BEGIN
  SELECT count(*)::integer, max(version) INTO v_count, v_head
  FROM supabase_migrations.schema_migrations;
  IF v_count <> 268 OR v_head <> '20261124234000' THEN
    RAISE EXCEPTION 'FAIL: expected ledger 268/20261124234000; found %/%', v_count, v_head;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version='20261124234000'
      AND name='revoke_postgres_global_public_function_execute') THEN
    RAISE EXCEPTION 'FAIL: exact candidate migration identity is absent';
  END IF;

  SELECT defaclacl INTO v_global FROM pg_default_acl
  WHERE defaclrole='postgres'::regrole AND defaclnamespace=0 AND defaclobjtype='f';
  IF v_global IS NULL OR EXISTS (
    SELECT 1 FROM aclexplode(v_global) a
    WHERE a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
      AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: global postgres function defaults still grant EXECUTE to PUBLIC/application roles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='storage'::regnamespace
      AND d.defaclobjtype='f' AND a.grantee='anon'::regrole AND a.privilege_type='EXECUTE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='storage'::regnamespace
      AND d.defaclobjtype='f' AND a.grantee='authenticated'::regrole AND a.privilege_type='EXECUTE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='storage'::regnamespace
      AND d.defaclobjtype='f' AND a.grantee='service_role'::regrole AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: intentional storage function defaults were not preserved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace=0
      AND d.defaclobjtype='f' AND a.grantee='postgres'::regrole
      AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: postgres owner EXECUTE default must be preserved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
      AND d.defaclobjtype='f' AND a.grantee='postgres'::regrole
      AND a.privilege_type='EXECUTE'
  ) OR EXISTS (
    SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
      AND d.defaclobjtype='f'
      AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
      AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: public-schema function defaults differ from reviewed owner-only baseline';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
    WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: current public functions have PUBLIC EXECUTE';
  END IF;
  RAISE NOTICE 'POSTFLIGHT PASS: 268-row ledger; one exact candidate row; global postgres EXECUTE defaults revoked; storage defaults preserved; zero current public functions with PUBLIC EXECUTE.';
END
$postflight$;
