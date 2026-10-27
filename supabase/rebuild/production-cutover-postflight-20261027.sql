-- READ-ONLY RELEASE POSTFLIGHT. Run after all eleven approved migrations.
-- This script performs no schema/data/ledger writes. Compare the full ledger export
-- with the saved preflight export to prove all original 244 rows remain unchanged.
DO $postflight$
DECLARE
  relation_count integer;
  auth_maintain integer;
  service_maintain integer;
  anon_privileged integer;
  auth_structural integer;
  service_structural integer;
  public_routines text[];
  default_maintain integer;
  anon_defaults integer;
  public_defaults integer;
  auth_defaults text[];
  service_defaults text[];
  ledger_count integer;
  ledger_head text;
  wrapper_definer boolean;
BEGIN
  SELECT count(*)::integer INTO relation_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p');
  IF relation_count <> 47 THEN RAISE EXCEPTION 'FAIL: expected 47 public relations, found %', relation_count; END IF;

  SELECT count(*)::integer INTO auth_maintain FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'MAINTAIN');
  SELECT count(*)::integer INTO service_maintain FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'MAINTAIN');
  IF auth_maintain <> 0 OR service_maintain <> 0 THEN RAISE EXCEPTION 'FAIL: current MAINTAIN remains (authenticated %, service_role %)', auth_maintain, service_maintain; END IF;

  SELECT count(*)::integer INTO anon_privileged FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (
    has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'INSERT')
    OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE')
    OR has_table_privilege('anon',c.oid,'TRUNCATE') OR has_table_privilege('anon',c.oid,'REFERENCES')
    OR has_table_privilege('anon',c.oid,'TRIGGER') OR has_table_privilege('anon',c.oid,'MAINTAIN'));
  IF anon_privileged <> 0 THEN RAISE EXCEPTION 'FAIL: anon has current privileges on % public relations', anon_privileged; END IF;

  SELECT count(*)::integer INTO auth_structural FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (
    has_table_privilege('authenticated',c.oid,'TRUNCATE') OR has_table_privilege('authenticated',c.oid,'REFERENCES')
    OR has_table_privilege('authenticated',c.oid,'TRIGGER'));
  IF auth_structural <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated has structural privileges on % public relations', auth_structural; END IF;

  SELECT count(*)::integer INTO service_structural FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (
    has_table_privilege('service_role',c.oid,'TRUNCATE') AND has_table_privilege('service_role',c.oid,'REFERENCES')
    AND has_table_privilege('service_role',c.oid,'TRIGGER'));
  IF service_structural <> 47 THEN RAISE EXCEPTION 'FAIL: service_role structural grants no longer match expected backend access (relations with all three: %)', service_structural; END IF;

  SELECT count(*)::integer INTO default_maintain
  FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
  LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE r.rolname='postgres' AND (n.nspname='public' OR d.defaclnamespace IS NULL)
    AND d.defaclobjtype='r' AND a.privilege_type='MAINTAIN'
    AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated','service_role'));
  IF default_maintain <> 0 THEN RAISE EXCEPTION 'FAIL: app-role/global/public MAINTAIN defaults remain: %', default_maintain; END IF;

  SELECT count(*)::integer INTO anon_defaults
  FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
  LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE r.rolname='postgres' AND (n.nspname='public' OR d.defaclnamespace IS NULL)
    AND d.defaclobjtype='r' AND pg_get_userbyid(a.grantee)='anon';
  IF anon_defaults <> 0 THEN RAISE EXCEPTION 'FAIL: postgres-owned global/public table defaults still grant anon (% entries)', anon_defaults; END IF;

  SELECT count(*)::integer INTO public_defaults
  FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
  LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE r.rolname='postgres' AND (n.nspname='public' OR d.defaclnamespace IS NULL)
    AND d.defaclobjtype='r' AND a.grantee=0;
  IF public_defaults <> 0 THEN RAISE EXCEPTION 'FAIL: PUBLIC has postgres-owned global/public table defaults (% entries)', public_defaults; END IF;

  SELECT array_agg(DISTINCT a.privilege_type ORDER BY a.privilege_type) INTO auth_defaults
  FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
  JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE r.rolname='postgres' AND n.nspname='public' AND d.defaclobjtype='r'
    AND pg_get_userbyid(a.grantee)='authenticated';
  IF auth_defaults IS DISTINCT FROM ARRAY['DELETE','INSERT','SELECT','UPDATE']::text[] THEN
    RAISE EXCEPTION 'FAIL: authenticated public-table defaults differ from CRUD-only: %', auth_defaults;
  END IF;

  SELECT array_agg(DISTINCT a.privilege_type ORDER BY a.privilege_type) INTO service_defaults
  FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
  JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE r.rolname='postgres' AND n.nspname='public' AND d.defaclobjtype='r'
    AND pg_get_userbyid(a.grantee)='service_role';
  IF service_defaults IS DISTINCT FROM ARRAY['DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']::text[] THEN
    RAISE EXCEPTION 'FAIL: service_role public-table defaults differ from intended CRUD+structural grants: %', service_defaults;
  END IF;

  SELECT array_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' ORDER BY n.nspname,p.proname)
    INTO public_routines
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE n.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE';
  IF public_routines IS DISTINCT FROM ARRAY[
    'public.normalize_zero_ownership_owner()',
    'public.preserve_closing_condominium_member_history()'
  ]::text[] THEN RAISE EXCEPTION 'FAIL: PUBLIC EXECUTE allowlist differs from the two reviewed trigger routines: %', public_routines; END IF;

  SELECT prosecdef INTO wrapper_definer FROM pg_proc WHERE oid='public.close_condominium_member_transfer(uuid)'::regprocedure;
  IF wrapper_definer IS DISTINCT FROM false THEN RAISE EXCEPTION 'FAIL: close-transfer wrapper is not SECURITY INVOKER'; END IF;
  IF has_function_privilege('anon','public.close_condominium_member_transfer(uuid)','EXECUTE')
     OR has_function_privilege('anon','private.close_condominium_member_transfer(uuid)','EXECUTE')
     OR has_function_privilege('anon','public.check_condominium_member_transfer_closure(uuid)','EXECUTE')
     OR has_function_privilege('anon','private.check_condominium_member_transfer_closure(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute a protected transfer routine';
  END IF;
  IF NOT has_schema_privilege('authenticated','private','USAGE')
     OR NOT has_schema_privilege('service_role','private','USAGE')
     OR NOT has_function_privilege('authenticated','private.close_condominium_member_transfer(uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','private.close_condominium_member_transfer(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.close_condominium_member_transfer(uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.close_condominium_member_transfer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated/service_role transfer invocation path is incomplete';
  END IF;

  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'SELECT')) <> 47
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'INSERT')) <> 41
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'UPDATE')) <> 41
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'DELETE')) <> 42 THEN
    RAISE EXCEPTION 'FAIL: authenticated current-table CRUD counts changed from captured Production baseline';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'SELECT')) <> 47
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'INSERT')) <> 47
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'UPDATE')) <> 47
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'DELETE')) <> 47 THEN
    RAISE EXCEPTION 'FAIL: service_role current-table CRUD counts changed from captured Production baseline';
  END IF;

  SELECT count(*)::integer, max(version) INTO ledger_count, ledger_head FROM supabase_migrations.schema_migrations;
  IF ledger_count <> 255 OR ledger_head <> '20261027110000' THEN
    RAISE EXCEPTION 'FAIL: expected ledger count 255 and head 20261027110000, found count %, head %', ledger_count, ledger_head;
  END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE (version,name) IN (
        ('20261022210629','restrict_private_function_public_execute'),
        ('20261022210630','harden_default_privileges_and_private_execute'),
        ('20261022213544','restrict_close_member_transfer_execute'),
        ('20261022233440','align_public_function_execute'),
        ('20261023000001','revoke_authenticated_maintain'),
        ('20261023000002','revoke_default_maintain'),
        ('20261023000003','revoke_service_role_maintain'),
        ('20261023000004','application_default_table_privileges'),
        ('20261023000733','use_invoker_for_close_transfer_rpc'),
        ('20261027100000','revoke_public_execute_from_transfer_closure_helpers'),
        ('20261027110000','repair_service_role_transfer_invoker_path')
      )) <> 11 THEN
    RAISE EXCEPTION 'FAIL: the eleven canonical forward migrations are not all recorded under exact version/name pairs';
  END IF;

  RAISE NOTICE 'POSTFLIGHT PASS: ACL/default-ACL/function invariants and eleven canonical migration records verified. Still compare the complete original ledger export and run application smoke tests before approval.';
END
$postflight$;
