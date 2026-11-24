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
  | grep -Ei 'check_condominium_member_transfer_closure|normalize_zero_ownership_owner|preserve_closing_condominium_member_history|generate_fiscal_year_carryovers|archive_condominium|close_condominium_fiscal_year|close_fiscal_year_and_generate_carryovers|compensate_fiscal_carryover|complete_portal_registration|confirm_condominium_creation_intake|delete_condominium|generate_installments_from_allocations|generate_installments_from_allocations_schedule|list_archived_condominiums|register_condominium_installment_payment|restore_condominium|set_personal_security_code|verify_personal_security_code|close_condominium_member_transfer' \
  > "$tmp_sql"
test -s "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/function-acl-postgres-assertions.sql
