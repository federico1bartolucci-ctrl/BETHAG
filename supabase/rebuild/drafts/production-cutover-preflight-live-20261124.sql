-- Read-only gate for the live-ledger ACL proposal. Never run as an apply script.
DO $preflight$
DECLARE
  v_count integer;
  v_head text;
  v_global aclitem[];
BEGIN
  SELECT count(*)::integer, max(version) INTO v_count, v_head
  FROM supabase_migrations.schema_migrations;
  IF v_count <> 267 OR v_head <> '20261105050000' THEN
    RAISE EXCEPTION 'STOP: expected exact live Production ledger 267/20261105050000; found %/%', v_count, v_head;
  END IF;

  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version='20261124234000'
       OR name='revoke_postgres_global_public_function_execute') THEN
    RAISE EXCEPTION 'STOP: candidate migration already exists in the ledger';
  END IF;

  SELECT COALESCE(
    (SELECT defaclacl FROM pg_default_acl
     WHERE defaclrole='postgres'::regrole AND defaclnamespace=0 AND defaclobjtype='f'),
    acldefault('f','postgres'::regrole)
  ) INTO v_global;
  IF v_global IS NULL
     OR NOT EXISTS (SELECT 1 FROM aclexplode(v_global) a
       WHERE a.grantee=0 AND a.privilege_type='EXECUTE') THEN
    RAISE EXCEPTION 'STOP: reviewed global PUBLIC EXECUTE defect is not present';
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
    RAISE EXCEPTION 'STOP: intentional storage function defaults differ from reviewed baseline';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM aclexplode(v_global) a
    WHERE a.grantee='postgres'::regrole AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'STOP: postgres owner EXECUTE default must be preserved';
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
    RAISE EXCEPTION 'STOP: public-schema function defaults differ from reviewed owner-only baseline';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
    WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'STOP: current public functions have PUBLIC EXECUTE; candidate only addresses future defaults';
  END IF;
  RAISE NOTICE 'PREFLIGHT PASS: exact 267-row ledger; candidate absent; global defect present; storage defaults preserved; zero current public functions with PUBLIC EXECUTE. Read-only only.';
END
$preflight$;
