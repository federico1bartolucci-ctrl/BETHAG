#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
migration="supabase/migrations/20261011120000_reconcile_function_body_and_acl_parity.sql"
tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$$;
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.check_condominium_member_transfer_closure(uuid) RETURNS jsonb LANGUAGE sql AS 'SELECT ''{}''::jsonb';
CREATE OR REPLACE FUNCTION public.check_condominium_member_transfer_closure(uuid) RETURNS jsonb LANGUAGE sql AS 'SELECT ''{}''::jsonb';
CREATE OR REPLACE FUNCTION public.normalize_zero_ownership_owner() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
CREATE OR REPLACE FUNCTION public.preserve_closing_condominium_member_history() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
CREATE OR REPLACE FUNCTION private.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION public.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS 'BEGIN RETURN private.generate_fiscal_year_carryovers($1,$2,$3,$4); END';
CREATE OR REPLACE FUNCTION private.archive_condominium(uuid,uuid,text) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.close_condominium_fiscal_year(uuid,uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.complete_portal_registration(text,text,text) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.admin_approve_portal_registration(uuid,uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{}''::jsonb';
CREATE OR REPLACE FUNCTION private.confirm_condominium_creation_intake(uuid,uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.delete_condominium(uuid,bigint,text) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.list_archived_condominiums(uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.restore_condominium(uuid,uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.set_personal_security_code(text,boolean) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.verify_personal_security_code(text) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
CREATE OR REPLACE FUNCTION private.close_condominium_member_transfer(uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
GRANT EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.close_condominium_member_transfer(uuid) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS 'BEGIN RETURN private.close_condominium_member_transfer($1); END';
SQL

# Execute the exact ACL statements from the migration against real PostgreSQL.
sed -E 's/^[[:space:]]+//' "$migration" \
  | grep -Ei '^(revoke all on function|grant execute on function)' \
  | grep -Ei 'check_condominium_member_transfer_closure|normalize_zero_ownership_owner|preserve_closing_condominium_member_history|generate_fiscal_year_carryovers|archive_condominium|close_condominium_fiscal_year|close_fiscal_year_and_generate_carryovers|compensate_fiscal_carryover|complete_portal_registration|admin_approve_portal_registration|confirm_condominium_creation_intake|delete_condominium|generate_installments_from_allocations|generate_installments_from_allocations_schedule|list_archived_condominiums|register_condominium_installment_payment|restore_condominium|set_personal_security_code|verify_personal_security_code|close_condominium_member_transfer' \
  > "$tmp_sql"
test -s "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/function-acl-postgres-assertions.sql

# Execute the real consumption-allocation function body with a mismatched fiscal year.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.condominium_ledger_entries (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  fiscal_year_id uuid,
  direction text NOT NULL,
  amount numeric NOT NULL,
  due_date date
);
INSERT INTO public.condominium_ledger_entries (
  id, workspace_id, condominium_id, fiscal_year_id, direction, amount
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000005',
  'Uscita',
  125.00
);
CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(uuid, text)
RETURNS boolean LANGUAGE sql AS 'SELECT true';
GRANT USAGE ON SCHEMA public, private TO authenticated;
GRANT SELECT, UPDATE ON public.condominium_ledger_entries TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_workspace_module(uuid, text) TO authenticated;
SQL

awk '
  index($0, "CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(") { capture=1 }
  capture { print }
  capture && $0 == "$function$;" { exit }
' "$migration" > "$tmp_sql"
test -s "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
GRANT EXECUTE ON FUNCTION public.generate_consumption_allocations(uuid, uuid, uuid, uuid, text) TO authenticated;
SQL
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/consumption-allocation-fiscal-year-assertions.sql

# Provide the minimal installment table before installing its production trigger.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.condominium_installments (
  id uuid PRIMARY KEY,
  ledger_entry_id uuid,
  amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL
);
SQL

# Execute the ledger-status trigger migration and verify both sides of reassignment.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261124170000_reconcile_ledger_status_on_installment_move.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/installment-ledger-status-regression.sql

# Verify that closing-member installment protection is case/whitespace insensitive.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/closing-member-installment-guard-regression.sql

# Preserve ledger references and paid SAL amounts when ledger rows are deleted/edited.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/ledger-work-progress-reference-guard-regression.sql

# Audit changes to SAL expense/payment ledger references even when no amount changes.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-progress-accounting-link-audit-regression.sql

# Record every tracked dimension when a single work update changes several fields.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-change-audit-regression.sql

# Prevent moving existing records out of archived condominiums.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/archived-condominium-move-regression.sql

# Capture SAL descriptive/date/sequence changes in the audit payload.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-progress-field-audit-regression.sql

# Require each installment to have a fiscal year containing its due date.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/installment-fiscal-year-due-date-regression.sql
