-- READ-ONLY RELEASE PREFLIGHT — Production live ledger recaptured 2026-11-05.
-- This script performs no schema, data, ACL or migration-ledger writes.
DO $preflight$
DECLARE
  expected_relations text[] := ARRAY[
    'activities','assemblies','communication_recipients','communications',
    'condominium_accounting_settings','condominium_allocation_intakes','condominium_allocation_rules',
    'condominium_audit_log','condominium_budgets','condominium_consumption_readings',
    'condominium_creation_intakes','condominium_expense_allocations','condominium_fiscal_carryover_compensations',
    'condominium_fiscal_carryovers','condominium_fiscal_years','condominium_funds','condominium_installments',
    'condominium_insurance_policies','condominium_ledger_entries','condominium_legal_cases',
    'condominium_member_transfers','condominium_members','condominium_millesimal_tables',
    'condominium_millesimal_values','condominium_payment_movements','condominium_payment_reversal_audit',
    'condominium_register_items','condominium_requests','condominium_suppliers','condominium_tax_obligations',
    'condominium_unit_transformation_items','condominium_unit_transformations','condominium_units',
    'condominium_work_documents','condominium_work_events','condominium_work_progress','condominium_works',
    'condominiums','deadlines','documents','portal_access','portal_registration_requests','profiles',
    'suppliers','user_security_settings','workspace_members','workspaces'
  ];
  actual_relations text[];
  ledger_count integer;
  ledger_head text;
  pending_versions text[] := ARRAY[
    '20261022210629','20261022210630','20261022213544','20261022233440',
    '20261023000001','20261023000002','20261023000003','20261023000004',
    '20261023000733','20261027100000','20261027110000','20261028100000',
    '20261102100100','20261102100200','20261104130000','20261105010000','20261105020000','20261105030000','20261105050000'
  ];
  count_value integer;
  public_routines text[];
  wrapper_definer boolean;
  workspace_member_data_exists boolean;
  save_condominium_definition text;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname) INTO actual_relations
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p');
  IF actual_relations IS DISTINCT FROM expected_relations THEN
    RAISE EXCEPTION 'STOP: public relation inventory differs from reviewed 47-table list: %', actual_relations;
  END IF;

  SELECT count(*)::integer, max(version) INTO ledger_count, ledger_head
  FROM supabase_migrations.schema_migrations;
  IF ledger_count <> 248 OR ledger_head <> '20261104222229' THEN
    RAISE EXCEPTION 'STOP: Production ledger changed: count %, sorted head %', ledger_count, ledger_head;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version='20261104222229' AND name='reconcile_production_acl_least_privilege') THEN
    RAISE EXCEPTION 'STOP: expected Production-only ACL migration identity is missing';
  END IF;
  IF to_regprocedure('private.upsert_portal_access_for_member(uuid,uuid,text,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: portal registration helper already exists; reconcile exact identity/effects first';
  END IF;
  IF to_regprocedure('private.apply_incoming_transfer_member_metadata()') IS NOT NULL THEN
    RAISE EXCEPTION 'STOP: incoming co-owner metadata function already exists; reconcile before cutover';
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ANY(pending_versions)) THEN
    RAISE EXCEPTION 'STOP: one or more pending canonical versions already exist; reconcile exact identity/effects first';
  END IF;

  SELECT count(*)::integer INTO count_value
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'MAINTAIN');
  IF count_value <> 0 THEN RAISE EXCEPTION 'STOP: authenticated MAINTAIN is not zero: %', count_value; END IF;
  SELECT count(*)::integer INTO count_value
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'MAINTAIN');
  IF count_value <> 0 THEN RAISE EXCEPTION 'STOP: service_role MAINTAIN is not zero: %', count_value; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'INSERT')
        OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE')
        OR has_table_privilege('anon',c.oid,'TRUNCATE'))
  ) THEN RAISE EXCEPTION 'STOP: anon has direct public table privileges'; END IF;

  SELECT count(*)::integer INTO count_value
  FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND n.nspname='public' AND d.defaclobjtype='r'
    AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    AND a.privilege_type='MAINTAIN';
  IF count_value <> 0 THEN RAISE EXCEPTION 'STOP: postgres-owned public default MAINTAIN remains: %', count_value; END IF;

  SELECT count(*)::integer INTO count_value
  FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='supabase_admin'::regrole AND n.nspname='public' AND d.defaclobjtype='r'
    AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    AND a.privilege_type='MAINTAIN';
  IF count_value <> 3 THEN RAISE EXCEPTION 'STOP: Supabase-managed default ACL drift changed; expected three documented provider-managed entries, found %', count_value; END IF;

  SELECT array_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
  INTO public_routines
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE n.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE';
  IF public_routines IS DISTINCT FROM ARRAY[
    'public.normalize_zero_ownership_owner()',
    'public.preserve_closing_condominium_member_history()'
  ]::text[] THEN RAISE EXCEPTION 'STOP: PUBLIC EXECUTE baseline changed: %', public_routines; END IF;

  SELECT prosecdef INTO wrapper_definer FROM pg_proc WHERE oid='public.close_condominium_member_transfer(uuid)'::regprocedure;
  IF wrapper_definer IS DISTINCT FROM false THEN RAISE EXCEPTION 'STOP: close-transfer wrapper is not SECURITY INVOKER'; END IF;
  IF NOT has_schema_privilege('service_role','private','USAGE')
     OR NOT has_function_privilege('service_role','private.close_condominium_member_transfer(uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','private.close_condominium_member_transfer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'STOP: private transfer invocation path differs from the current Production baseline';
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data')
  INTO workspace_member_data_exists;
  IF workspace_member_data_exists THEN RAISE EXCEPTION 'STOP: workspace_members.data already exists; reconcile before cutover'; END IF;

  SELECT pg_get_functiondef('private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)'::regprocedure)
  INTO save_condominium_definition;
  IF position('archived_at = public.condominiums.archived_at' in lower(save_condominium_definition)) > 0
     OR position('archived_by = public.condominiums.archived_by' in lower(save_condominium_definition)) > 0
     OR position('archive_reason = public.condominiums.archive_reason' in lower(save_condominium_definition)) > 0 THEN
    RAISE EXCEPTION 'STOP: archive-preserving save_condominium already present; reconcile before cutover';
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: 47 relations, exact 248-row ledger, current forward ACL state and nineteen absent canonical version pairs verified. supabase_admin default MAINTAIN exception remains subject to provider/security-owner disposition. This is not release approval.';
END
$preflight$;
