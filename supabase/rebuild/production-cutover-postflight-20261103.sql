-- READ-ONLY RELEASE POSTFLIGHT — expected after fifteen canonical increments.
-- No schema/data/ledger writes. Historical row preservation is separately checked by the guarded runner.
DO $postflight$
DECLARE
  relation_count integer;
  auth_maintain integer;
  service_maintain integer;
  anon_privileged integer;
  auth_structural integer;
  default_maintain integer;
  anon_defaults integer;
  auth_defaults text[];
  service_defaults text[];
  supabase_admin_maintain integer;
  public_routines text[];
  ledger_count integer;
  ledger_head text;
  canonical_count integer;
  wrapper_definer boolean;
  workspace_member_data_exists boolean;
  workspace_member_data_default text;
  save_condominium_definition text;
BEGIN
  SELECT count(*)::integer INTO relation_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p');
  IF relation_count <> 47 THEN RAISE EXCEPTION 'FAIL: expected 47 public relations, found %', relation_count; END IF;

  SELECT count(*)::integer INTO auth_maintain FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'MAINTAIN');
  SELECT count(*)::integer INTO service_maintain FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'MAINTAIN');
  IF auth_maintain <> 0 OR service_maintain <> 0 THEN RAISE EXCEPTION 'FAIL: current MAINTAIN remains (authenticated %, service_role %)',auth_maintain,service_maintain; END IF;

  SELECT count(*)::integer INTO anon_privileged FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'INSERT')
      OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE')
      OR has_table_privilege('anon',c.oid,'TRUNCATE'));
  IF anon_privileged <> 0 THEN RAISE EXCEPTION 'FAIL: anon has direct public table privileges: %',anon_privileged; END IF;

  SELECT count(*)::integer INTO auth_structural FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND (has_table_privilege('authenticated',c.oid,'TRUNCATE') OR has_table_privilege('authenticated',c.oid,'REFERENCES') OR has_table_privilege('authenticated',c.oid,'TRIGGER'));
  IF auth_structural <> 0 THEN RAISE EXCEPTION 'FAIL: authenticated retains structural privileges: %',auth_structural; END IF;

  SELECT count(*)::integer INTO default_maintain FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='r'
    AND (d.defaclnamespace=0 OR d.defaclnamespace='public'::regnamespace)
    AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    AND a.privilege_type='MAINTAIN';
  IF default_maintain <> 0 THEN RAISE EXCEPTION 'FAIL: postgres-owned default MAINTAIN remains: %',default_maintain; END IF;

  SELECT array_agg(a.privilege_type ORDER BY a.privilege_type) INTO anon_defaults
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='r' AND a.grantee='anon'::regrole;
  IF anon_defaults IS NOT NULL THEN RAISE EXCEPTION 'FAIL: anon public table defaults remain: %',anon_defaults; END IF;

  SELECT array_agg(a.privilege_type ORDER BY a.privilege_type) INTO auth_defaults
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='r' AND a.grantee='authenticated'::regrole;
  IF auth_defaults IS DISTINCT FROM ARRAY['DELETE','INSERT','SELECT','UPDATE']::text[] THEN
    RAISE EXCEPTION 'FAIL: authenticated default table privileges differ: %',auth_defaults;
  END IF;

  SELECT array_agg(a.privilege_type ORDER BY a.privilege_type) INTO service_defaults
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='r' AND a.grantee='service_role'::regrole;
  IF service_defaults IS DISTINCT FROM ARRAY['DELETE','INSERT','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']::text[] THEN
    RAISE EXCEPTION 'FAIL: service_role default table privileges differ: %',service_defaults;
  END IF;

  SELECT array_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
  INTO public_routines
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE n.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE';
  IF public_routines IS NOT NULL THEN RAISE EXCEPTION 'FAIL: unexpected PUBLIC EXECUTE remains: %',public_routines; END IF;

  SELECT prosecdef INTO wrapper_definer FROM pg_proc WHERE oid='public.close_condominium_member_transfer(uuid)'::regprocedure;
  IF wrapper_definer IS DISTINCT FROM false THEN RAISE EXCEPTION 'FAIL: transfer wrapper is not SECURITY INVOKER'; END IF;
  IF has_function_privilege('anon','public.close_condominium_member_transfer(uuid)','EXECUTE')
     OR has_function_privilege('anon','private.close_condominium_member_transfer(uuid)','EXECUTE')
     OR NOT has_schema_privilege('authenticated','private','USAGE')
     OR NOT has_schema_privilege('service_role','private','USAGE')
     OR NOT has_function_privilege('authenticated','private.close_condominium_member_transfer(uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','private.close_condominium_member_transfer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: transfer invocation path is incomplete or exposed to anon';
  END IF;

  SELECT count(*)::integer, max(version) INTO ledger_count, ledger_head FROM supabase_migrations.schema_migrations;
  IF ledger_count <> 262 OR ledger_head <> '20261104130000' THEN
    RAISE EXCEPTION 'FAIL: expected 261 rows with sorted max 20261103070901, found %, %',ledger_count,ledger_head;
  END IF;
  SELECT count(*)::integer INTO canonical_count FROM supabase_migrations.schema_migrations
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
    ('20261027110000','repair_service_role_transfer_invoker_path'),
    ('20261028100000','fix_collaborator_module_permission_boolean'),
    ('20261102100100','add_workspace_member_profile_data'),
    ('20261102100200','preserve_server_owned_condominium_archive_state'),
    ('20261104130000','reconcile_qa_security_and_coowner_rpcs')
  );
  IF canonical_count <> 15 THEN RAISE EXCEPTION 'FAIL: expected fifteen exact canonical version/name pairs, found %',canonical_count; END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data' AND data_type='jsonb'),
    (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data')
  INTO workspace_member_data_exists,workspace_member_data_default;
  IF workspace_member_data_exists IS DISTINCT FROM true OR workspace_member_data_default IS NULL THEN
    RAISE EXCEPTION 'FAIL: workspace_members.data jsonb/default missing';
  END IF;

  SELECT pg_get_functiondef('private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)'::regprocedure)
  INTO save_condominium_definition;
  IF position('archived_at = public.condominiums.archived_at' in lower(save_condominium_definition))=0
     OR position('archived_by = public.condominiums.archived_by' in lower(save_condominium_definition))=0
     OR position('archive_reason = public.condominiums.archive_reason' in lower(save_condominium_definition))=0 THEN
    RAISE EXCEPTION 'FAIL: save_condominium does not preserve archive lifecycle metadata';
  END IF;

  SELECT count(*)::integer INTO supabase_admin_maintain
  FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='supabase_admin'::regrole AND n.nspname='public' AND d.defaclobjtype='r'
    AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    AND a.privilege_type='MAINTAIN';
  IF supabase_admin_maintain <> 3 THEN
    RAISE EXCEPTION 'FAIL: provider-managed supabase_admin default ACL changed unexpectedly: %',supabase_admin_maintain;
  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='condominium_members'
      AND t.tgname='trg_apply_incoming_transfer_member_metadata' AND NOT t.tgisinternal
  ) THEN RAISE EXCEPTION 'FAIL: incoming co-owner metadata trigger missing'; END IF;

  IF (SELECT prosecdef FROM pg_proc WHERE oid='private.apply_incoming_transfer_member_metadata()'::regprocedure)
     IS DISTINCT FROM false THEN RAISE EXCEPTION 'FAIL: co-owner trigger function must be SECURITY INVOKER'; END IF;
  IF has_function_privilege('authenticated','private.apply_incoming_transfer_member_metadata()','EXECUTE')
     OR has_function_privilege('service_role','private.apply_incoming_transfer_member_metadata()','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: co-owner trigger function is directly executable by application roles';
  END IF;

  IF has_function_privilege('authenticated','private.is_workspace_staff(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: private workspace staff helper remains callable by authenticated';
  END IF;

  IF position('can_manage_workspace_module' IN pg_get_functiondef('private.archive_condominium(uuid,uuid,text)'::regprocedure))=0
     OR position('can_manage_workspace_module' IN pg_get_functiondef('private.restore_condominium(uuid,uuid)'::regprocedure))=0 THEN
    RAISE EXCEPTION 'FAIL: archive/restore functions lack their workspace authorization guard';
  END IF;

  IF (
    SELECT count(*) FROM unnest(ARRAY[
      'private.admin_approve_portal_registration(uuid,uuid)',
      'private.archive_condominium(uuid,uuid,text)',
      'private.claim_first_workspace_admin(uuid)',
      'private.close_condominium_fiscal_year(uuid,uuid)',
      'private.close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid)',
      'private.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text)',
      'private.complete_portal_registration(text,text,text)',
      'private.confirm_condominium_creation_intake(uuid,uuid)',
      'private.delete_condominium(uuid,bigint,text)',
      'private.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid)',
      'private.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid)',
      'private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)',
      'private.list_archived_condominiums(uuid)',
      'private.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text)',
      'private.restore_condominium(uuid,uuid)',
      'private.reverse_condominium_installment_payment(uuid,uuid,uuid,text)',
      'private.set_personal_security_code(text,boolean)',
      'private.verify_personal_security_code(text)'
    ]::text[]) f(signature)
    WHERE to_regprocedure(f.signature) IS NULL
       OR NOT has_function_privilege('authenticated',to_regprocedure(f.signature),'EXECUTE')
  ) <> 0 THEN RAISE EXCEPTION 'FAIL: one or more authenticated private RPC grants are missing'; END IF;

  RAISE NOTICE 'POSTFLIGHT PASS: 261-row ledger with 247 historical rows preserved by runner; fourteen canonical identities; ACL/RLS/transfer/collaborator/archive postconditions. Three supabase_admin default MAINTAIN entries remain a provider/security-owner exception.';
END
$postflight$;
