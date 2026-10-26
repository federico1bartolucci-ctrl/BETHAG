#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:?PGPORT is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGDATABASE:?PGDATABASE is required}"

PSQL=(psql -X -v ON_ERROR_STOP=1)

"${PSQL[@]}" <<'SQL'
DO $$
DECLARE role_name text;
DECLARE rel_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
    END IF;
  END LOOP;

  FOREACH rel_name IN ARRAY ARRAY[
    'activities','assemblies','communication_recipients','communications',
    'condominium_accounting_settings','condominium_allocation_intakes',
    'condominium_allocation_rules','condominium_audit_log','condominium_budgets',
    'condominium_consumption_readings','condominium_creation_intakes',
    'condominium_expense_allocations','condominium_fiscal_carryover_compensations',
    'condominium_fiscal_carryovers','condominium_fiscal_years','condominium_fund_availability',
    'condominium_funds','condominium_installments','condominium_insurance_policies',
    'condominium_ledger_entries','condominium_legal_cases','condominium_member_transfers',
    'condominium_members','condominium_millesimal_tables','condominium_millesimal_values',
    'condominium_payment_movements','condominium_payment_reversal_audit',
    'condominium_register_items','condominium_requests','condominium_suppliers',
    'condominium_tax_obligations','condominium_unit_transformation_items',
    'condominium_unit_transformations','condominium_units','condominium_work_documents',
    'condominium_work_events','condominium_work_progress','condominium_works',
    'condominiums','deadlines','documents','portal_access','portal_registration_requests',
    'profiles','suppliers','user_security_settings','workspace_members','workspaces'
  ] LOOP
    EXECUTE format('CREATE TABLE public.%I (id bigint)', rel_name);
  END LOOP;

  EXECUTE 'GRANT MAINTAIN ON ALL TABLES IN SCHEMA public TO authenticated';
  EXECUTE 'GRANT MAINTAIN ON ALL TABLES IN SCHEMA public TO service_role';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT MAINTAIN ON TABLES TO anon, authenticated, service_role';
END
$$;
SQL

for migration in \
  supabase/migrations/20261023000001_revoke_authenticated_maintain.sql \
  supabase/migrations/20261023000002_revoke_default_maintain.sql \
  supabase/migrations/20261023000003_revoke_service_role_maintain.sql \
  supabase/migrations/20261023000004_application_default_table_privileges.sql
do
  "${PSQL[@]}" -f "$migration"
done

"${PSQL[@]}" <<'SQL'
DO $$
DECLARE bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (has_table_privilege('authenticated', c.oid, 'MAINTAIN')
      OR has_table_privilege('service_role', c.oid, 'MAINTAIN'));

  IF bad_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero direct MAINTAIN privileges after migrations; found %', bad_count;
  END IF;

  SELECT count(*) INTO bad_count
  FROM pg_default_acl d
  JOIN pg_namespace n ON n.oid = d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE n.nspname = 'public'
    AND d.defaclobjtype = 'r'
    AND a.privilege_type = 'MAINTAIN'
    AND a.grantee IN (
      SELECT oid FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
    );

  IF bad_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero application-role default MAINTAIN privileges; found %', bad_count;
  END IF;
END
$$;
SQL

echo "MAINTAIN privilege migration test passed."
