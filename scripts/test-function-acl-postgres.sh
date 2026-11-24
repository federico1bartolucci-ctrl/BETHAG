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
SQL

# Execute the exact ACL statements from the migration against real PostgreSQL.
sed -E 's/^[[:space:]]+//' "$migration" \
  | grep -Ei '^(revoke all on function|grant execute on function)' \
  | grep -Ei 'check_condominium_member_transfer_closure|normalize_zero_ownership_owner|preserve_closing_condominium_member_history|generate_fiscal_year_carryovers' \
  > "$tmp_sql"
test -s "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$tmp_sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/function-acl-postgres-assertions.sql
