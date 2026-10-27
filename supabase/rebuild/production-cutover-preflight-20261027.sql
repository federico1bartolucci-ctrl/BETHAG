-- READ-ONLY RELEASE PREFLIGHT. Run only against Production immediately before an approved window.
-- This script is intentionally fail-closed. It performs no schema/data/ledger writes.
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
    '20261023000733','20261027100000','20261027110000'
  ];
  role_name text;
  role_maintain integer;
  public_routines text[];
  public_routine_count integer;
  postgres_default_maintain integer;
  wrapper_definer boolean;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname) INTO actual_relations
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p');
  IF actual_relations IS DISTINCT FROM expected_relations THEN
    RAISE EXCEPTION 'STOP: public relation inventory differs from reviewed 47-table list. Actual: %', actual_relations;
  END IF;

  SELECT count(*)::integer, max(version) FILTER (WHERE version IS NOT NULL)
    INTO ledger_count, ledger_head
  FROM supabase_migrations.schema_migrations;
  IF ledger_count <> 244 OR ledger_head <> '20261022202747' THEN
    RAISE EXCEPTION 'STOP: Production migration ledger changed: count %, max version %', ledger_count, ledger_head;
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ANY(pending_versions)) THEN
    RAISE EXCEPTION 'STOP: one or more proposed canonical versions already exist in Production ledger; reconcile identity/effects before continuing';
  END IF;

  SELECT count(*)::integer INTO role_maintain FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('authenticated',c.oid,'MAINTAIN');
  IF role_maintain <> 33 THEN RAISE EXCEPTION 'STOP: authenticated MAINTAIN baseline changed: %', role_maintain; END IF;
  SELECT count(*)::integer INTO role_maintain FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege('service_role',c.oid,'MAINTAIN');
  IF role_maintain <> 47 THEN RAISE EXCEPTION 'STOP: service_role MAINTAIN baseline changed: %', role_maintain; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'INSERT')
        OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE'))
  ) THEN RAISE EXCEPTION 'STOP: anon current-table CRUD is no longer zero'; END IF;

  SELECT count(*)::integer INTO postgres_default_maintain
  FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole
  LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE r.rolname='postgres' AND (n.nspname='public' OR d.defaclnamespace IS NULL)
    AND d.defaclobjtype='r' AND a.privilege_type='MAINTAIN'
    AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated','service_role'));
  IF postgres_default_maintain <> 3 THEN RAISE EXCEPTION 'STOP: expected three postgres-owned public/global MAINTAIN default entries; found %', postgres_default_maintain; END IF;

  SELECT array_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' ORDER BY n.nspname,p.proname)
    INTO public_routines
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE n.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE';
  public_routine_count := coalesce(array_length(public_routines,1),0);
  IF public_routine_count <> 4 OR NOT (
    'private.check_condominium_member_transfer_closure(p_transfer_id uuid)' = ANY(public_routines)
    AND 'public.check_condominium_member_transfer_closure(p_transfer_id uuid)' = ANY(public_routines)
    AND 'public.normalize_zero_ownership_owner()' = ANY(public_routines)
    AND 'public.preserve_closing_condominium_member_history()' = ANY(public_routines)
  ) THEN RAISE EXCEPTION 'STOP: PUBLIC EXECUTE routine allowlist changed: %', public_routines; END IF;

  SELECT prosecdef INTO wrapper_definer FROM pg_proc WHERE oid='public.close_condominium_member_transfer(uuid)'::regprocedure;
  IF wrapper_definer IS DISTINCT FROM true THEN RAISE EXCEPTION 'STOP: close-transfer wrapper security state differs from captured Production baseline'; END IF;
  IF has_function_privilege('anon','public.close_condominium_member_transfer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'STOP: anon can execute the close-transfer wrapper';
  END IF;
  IF has_schema_privilege('service_role','private','USAGE')
     OR has_function_privilege('service_role','private.close_condominium_member_transfer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'STOP: service_role private invocation path differs from captured baseline; refresh and review before applying the correction';
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: exact 47-relation inventory, Production ledger 244/head 20261022202747, ACL/function baseline matches capture. This is not release approval.';
END
$preflight$;
