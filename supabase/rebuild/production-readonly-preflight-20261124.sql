-- BETHAG Production read-only preflight — 2026-11-24
-- Purpose: validate the CURRENT post-migration Production state before any release decision.
-- This supersedes neither the historical 2026-11-05 cutover preflight nor the postflight.
-- READ-ONLY: catalog/ledger SELECTs only. No DDL, DML, grants, migrations, deploys or provider calls.
-- External gates NOT PROVABLE by SQL are reported explicitly at the end.

DO $preflight$
DECLARE
  expected_tables text[] := ARRAY[
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
  expected_view text := 'condominium_fund_availability';
  actual_tables text[];
  actual_views text[];
  n integer;
  ledger_min text;
  ledger_max text;
  canonical_exact integer;
  canonical_versions integer;
  public_exec text[];
  auth_maintain integer;
  service_maintain integer;
  anon_table_access integer;
  auth_structural integer;
  pg_default_maintain integer;
  pg_function_sequence_defaults integer;
  provider_maintain integer;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname) INTO actual_tables
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('r','p');
  IF actual_tables IS DISTINCT FROM expected_tables THEN
    RAISE EXCEPTION 'STOP: public table inventory mismatch: %', actual_tables;
  END IF;

  SELECT array_agg(c.relname ORDER BY c.relname) INTO actual_views
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('v','m');
  IF actual_views IS DISTINCT FROM ARRAY[expected_view]::text[] THEN
    RAISE EXCEPTION 'STOP: public view inventory mismatch: %', actual_views;
  END IF;

  SELECT count(*)::integer INTO n
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity;
  IF n <> 0 THEN RAISE EXCEPTION 'STOP: public tables without RLS: %',n; END IF;

  SELECT count(*)::integer, min(version), max(version)
  INTO n, ledger_min, ledger_max
  FROM supabase_migrations.schema_migrations;
  IF n <> 267 OR ledger_min <> '20260928021707' OR ledger_max <> '20261105050000' THEN
    RAISE EXCEPTION 'STOP: Production migration ledger changed: count %, min %, max %',n,ledger_min,ledger_max;
  END IF;

  WITH expected(version,name) AS (VALUES
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
    ('20261104130000','reconcile_qa_security_and_coowner_rpcs'),
    ('20261105010000','reconcile_postgres_public_table_default_acl'),
    ('20261105020000','revoke_public_execute_from_public_trigger_functions'),
    ('20261105030000','reconcile_postgres_public_function_sequence_default_acl'),
    ('20261105050000','reconcile_portal_registration_upsert')
  )
  SELECT count(*) FILTER (WHERE m.version=e.version AND m.name=e.name)::integer,
         count(DISTINCT m.version)::integer
  INTO canonical_exact, canonical_versions
  FROM expected e LEFT JOIN supabase_migrations.schema_migrations m ON m.version=e.version;
  IF canonical_exact <> 19 OR canonical_versions <> 19 THEN
    RAISE EXCEPTION 'STOP: canonical migration identities mismatch: exact %, distinct versions %',canonical_exact,canonical_versions;
  END IF;

  SELECT count(*)::integer INTO auth_maintain
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('r','p','v','m')
    AND has_table_privilege('authenticated',c.oid,'MAINTAIN');
  SELECT count(*)::integer INTO service_maintain
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('r','p','v','m')
    AND has_table_privilege('service_role',c.oid,'MAINTAIN');
  IF auth_maintain <> 0 OR service_maintain <> 0 THEN
    RAISE EXCEPTION 'STOP: MAINTAIN privileges remain: authenticated %, service_role %',auth_maintain,service_maintain;
  END IF;

  SELECT count(*)::integer INTO anon_table_access
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('r','p')
    AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'INSERT')
      OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE')
      OR has_table_privilege('anon',c.oid,'TRUNCATE'));
  IF anon_table_access <> 0 THEN RAISE EXCEPTION 'STOP: anon direct table privileges found: %',anon_table_access; END IF;

  SELECT count(*)::integer INTO auth_structural
  FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE s.nspname='public' AND c.relkind IN ('r','p','v','m')
    AND (has_table_privilege('authenticated',c.oid,'TRUNCATE')
      OR has_table_privilege('authenticated',c.oid,'REFERENCES')
      OR has_table_privilege('authenticated',c.oid,'TRIGGER'));
  IF auth_structural <> 0 THEN RAISE EXCEPTION 'STOP: authenticated structural privileges found: %',auth_structural; END IF;

  SELECT count(*)::integer INTO pg_default_maintain
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole
    AND (d.defaclnamespace=0 OR d.defaclnamespace='public'::regnamespace)
    AND d.defaclobjtype='r'
    AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    AND a.privilege_type='MAINTAIN';
  IF pg_default_maintain <> 0 THEN RAISE EXCEPTION 'STOP: postgres default MAINTAIN entries: %',pg_default_maintain; END IF;

  SELECT count(*)::integer INTO provider_maintain
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='supabase_admin'::regrole AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='r'
    AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    AND a.privilege_type='MAINTAIN';
  IF provider_maintain <> 3 THEN
    RAISE EXCEPTION 'STOP: documented Supabase-managed default MAINTAIN exception changed: %',provider_maintain;
  END IF;

  SELECT count(*)::integer INTO pg_function_sequence_defaults
  FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole
    AND (d.defaclnamespace=0 OR d.defaclnamespace='public'::regnamespace)
    AND d.defaclobjtype IN ('f','S')
    AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole);
  IF pg_function_sequence_defaults <> 0 THEN
    RAISE EXCEPTION 'STOP: postgres function/sequence default ACL entries remain: %',pg_function_sequence_defaults;
  END IF;

  SELECT array_agg(s.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')'
                   ORDER BY s.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
  INTO public_exec
  FROM pg_proc p JOIN pg_namespace s ON s.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
  WHERE s.nspname IN ('public','private') AND a.grantee=0 AND a.privilege_type='EXECUTE';
  IF public_exec IS NOT NULL THEN RAISE EXCEPTION 'STOP: PUBLIC EXECUTE functions remain: %',public_exec; END IF;

  IF NOT has_schema_privilege('authenticated','private','USAGE')
     OR NOT has_schema_privilege('service_role','private','USAGE') THEN
    RAISE EXCEPTION 'STOP: private schema USAGE missing for application roles';
  END IF;

  IF (SELECT prosecdef FROM pg_proc WHERE oid='public.close_condominium_member_transfer(uuid)'::regprocedure)
       IS DISTINCT FROM false
     OR has_function_privilege('anon','public.close_condominium_member_transfer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'STOP: close-transfer wrapper security mode/anon ACL mismatch';
  END IF;

  IF to_regprocedure('private.upsert_portal_access_for_member(uuid,uuid,text,jsonb)') IS NULL
     OR to_regprocedure('private.apply_incoming_transfer_member_metadata()') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
       JOIN pg_namespace s ON s.oid=c.relnamespace
       WHERE s.nspname='public' AND c.relname='condominium_members'
         AND t.tgname='trg_apply_incoming_transfer_member_metadata' AND NOT t.tgisinternal
     ) THEN
    RAISE EXCEPTION 'STOP: portal upsert or incoming transfer metadata trigger objects missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data'
      AND data_type='jsonb' AND is_nullable='NO' AND column_default='''{}''::jsonb'
  ) THEN RAISE EXCEPTION 'STOP: workspace_members.data contract mismatch'; END IF;

  IF position('archived_at = public.condominiums.archived_at' IN lower(pg_get_functiondef(
       'private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)'::regprocedure)))=0
     OR position('archived_by = public.condominiums.archived_by' IN lower(pg_get_functiondef(
       'private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)'::regprocedure)))=0
     OR position('archive_reason = public.condominiums.archive_reason' IN lower(pg_get_functiondef(
       'private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)'::regprocedure)))=0 THEN
    RAISE EXCEPTION 'STOP: save_condominium archive lifecycle preservation mismatch';
  END IF;

  RAISE NOTICE 'READ-ONLY PREFLIGHT PASS: 47 public tables, expected public view, RLS, 267-row ledger, 19 canonical identities, ACL/security and critical RPC/trigger postconditions verified. External release gates remain separate.';
END
$preflight$;

-- Human-readable evidence summary. A successful result does NOT certify external gates.
SELECT
  current_database() AS database_name,
  current_setting('server_version') AS postgres_version,
  (SELECT count(*) FROM supabase_migrations.schema_migrations)::integer AS migration_rows,
  (SELECT min(version) FROM supabase_migrations.schema_migrations) AS ledger_first_version,
  (SELECT max(version) FROM supabase_migrations.schema_migrations) AS ledger_last_version,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
    WHERE s.nspname='public' AND c.relkind IN ('r','p'))::integer AS public_table_count,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
    WHERE s.nspname='public' AND c.relkind IN ('v','m'))::integer AS public_view_count,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
    WHERE s.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity)::integer AS public_tables_without_rls,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
    WHERE s.nspname='public' AND c.relkind IN ('r','p','v','m')
      AND has_table_privilege('authenticated',c.oid,'MAINTAIN'))::integer AS authenticated_maintain_count,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
    WHERE s.nspname='public' AND c.relkind IN ('r','p','v','m')
      AND has_table_privilege('service_role',c.oid,'MAINTAIN'))::integer AS service_role_maintain_count,
  has_schema_privilege('authenticated','private','USAGE') AS authenticated_private_usage,
  has_schema_privilege('service_role','private','USAGE') AS service_role_private_usage,
  (SELECT count(*) FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole='supabase_admin'::regrole AND d.defaclnamespace='public'::regnamespace
      AND d.defaclobjtype='r'
      AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
      AND a.privilege_type='MAINTAIN')::integer AS provider_managed_default_maintain_exceptions,
  'NOT VERIFIED BY SQL: Data API exposed schemas (including supabase_functions); verify in Supabase Dashboard > API Settings' AS data_api_gate,
  'NOT VERIFIED BY SQL: backup restore evidence, migration execution provenance, owner approval, operator, maintenance window and rollback readiness' AS operational_gates;
