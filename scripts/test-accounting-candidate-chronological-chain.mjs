#!/usr/bin/env node
/**
 * Rehearse the complete candidate migration directory in strict chronological
 * order on a disposable local PostgreSQL database. This deliberately does not
 * mutate or replace the frozen Production/QA cutover manifest.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
  "Refusing non-local DATABASE_URL; candidate rehearsal must use disposable PostgreSQL only.");

function psql(args, input) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    input,
  });
}

const migrationDirectory = "supabase/migrations";
const candidateDirectory = "supabase/rebuild/candidates/accounting-point1-20261124";
const canonicalFiles = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
const candidateFiles = (await readdir(candidateDirectory)).filter((name) => name.endsWith(".sql")).sort();
const expectedCandidateFiles = [
  "20261124170000_reconcile_ledger_status_on_installment_move.sql",
  "20261124202340_prevent_work_delete_with_progress.sql",
  "20261124220000_prevent_mutation_from_archived_condominium.sql",
  "20261124223000_audit_all_work_progress_fields.sql",
  "20261124233000_validate_installment_fiscal_year_due_date.sql",
  "20261124240000_audit_work_details_and_references.sql",
  "20261124240100_normalize_closing_member_installment_guard.sql",
  "20261124240200_guard_ledger_entries_linked_to_work_progress.sql",
  "20261124240400_harden_work_progress_payment_allocation.sql",
  "20261124240600_lock_fiscal_year_parent_rows.sql",
];
assert.equal(canonicalFiles.length, 28, `Expected frozen 28-file canonical migration chain, found ${canonicalFiles.length}`);
assert.deepEqual(candidateFiles, expectedCandidateFiles, "Accounting candidate set differs from the reviewed ten-file set.");
const files = [...canonicalFiles, ...candidateFiles].sort();
assert.equal(files.length, 38, `Expected 38 files across canonical plus staged candidate chains, found ${files.length}`);
assert.equal(new Set(files.map((name) => name.slice(0, 14))).size, files.length,
  "Candidate migration versions must be unique.");
for (const name of files) {
  assert.match(name, /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/, "Invalid candidate migration filename: " + name);
}

const grantSql = await readFile(migrationDirectory + "/20261017000005_bethag_baseline_grants.sql", "utf8");
const roles = new Set(["anon", "authenticated", "service_role", "authenticator", "supabase_admin"]);
for (const pattern of [
  /\bTO\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
  /\bFOR\s+ROLE\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
]) {
  for (const match of grantSql.matchAll(pattern)) {
    const role = (match[1] ?? match[2]).replace(/""/g, '"');
    if (!["PUBLIC", "public", "postgres"].includes(role)) roles.add(role);
  }
}

const bootstrapSql = [
  "CREATE SCHEMA IF NOT EXISTS auth;",
  "CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);",
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';",
  "CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT NULL::text';",
  "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS 'SELECT ''{}''::jsonb';",
  ...[...roles].sort().filter((role) => role !== "postgres").map((role) => {
    const identifier = role.replace(/"/g, '""');
    const literal = role.replace(/'/g, "''");
    return "DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '" + literal +
      "') THEN CREATE ROLE \"" + identifier + "\" NOLOGIN; END IF; END $role$;";
  }),
].join("\n");
psql(["-c", bootstrapSql]);

for (const filename of files) {
  console.log("Applying candidate migration " + filename);
  const sourceDirectory = candidateFiles.includes(filename) ? candidateDirectory : migrationDirectory;
  psql(["-f", sourceDirectory + "/" + filename]);
}

const query = `
SELECT json_build_object(
  'public_tables', (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
  'application_maintain_relations', (
    SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')
      AND (has_table_privilege('anon',c.oid,'MAINTAIN')
        OR has_table_privilege('authenticated',c.oid,'MAINTAIN')
        OR has_table_privilege('service_role',c.oid,'MAINTAIN'))
  ),
  'work_delete_guard_function', to_regprocedure('public.prevent_work_delete_with_progress()') IS NOT NULL,
  'work_delete_guard_trigger', EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='condominium_works'
      AND t.tgname='trg_prevent_work_delete_with_progress' AND NOT t.tgisinternal
  ),
  'archive_guard_function', to_regprocedure('public.prevent_archived_condominium_mutation()') IS NOT NULL,
  'archive_guard_trigger', EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='condominium_works'
      AND t.tgname='trg_prevent_archived_condominium_mutation' AND NOT t.tgisinternal
  ),
  'installment_scope_guard', to_regprocedure('public.validate_condominium_installment_scope()') IS NOT NULL,
  'ledger_integrity_guard', to_regprocedure('public.guard_ledger_entry_integrity()') IS NOT NULL,
  'sal_payment_guard', to_regprocedure('public.validate_condominium_work_progress_accounting_links()') IS NOT NULL,
  'sal_audit_trigger', EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='condominium_work_progress'
      AND t.tgname='audit_condominium_work_progress_change' AND NOT t.tgisinternal
  ),
  'work_audit_trigger', EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='condominium_works'
      AND t.tgname='audit_condominium_work_change' AND NOT t.tgisinternal
  ),
  'installment_status_trigger', EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='condominium_installments'
      AND t.tgname='trg_sync_expense_payment_status' AND NOT t.tgisinternal
  ),
  'closed_accounting_guard', to_regprocedure('public.prevent_closed_condominium_accounting()') IS NOT NULL
)::text;`;
const state = JSON.parse(psql(["-A", "-t", "-c", query]).trim());
assert.equal(state.public_tables, 47, "Unexpected public table count after candidate chain.");
assert.equal(state.application_maintain_relations, 0, "Application roles retain MAINTAIN on public relations.");
for (const key of [
  "work_delete_guard_function", "work_delete_guard_trigger",
  "archive_guard_function", "archive_guard_trigger",
  "installment_scope_guard", "ledger_integrity_guard",
  "sal_payment_guard", "sal_audit_trigger", "work_audit_trigger",
  "installment_status_trigger", "closed_accounting_guard",
]) assert.equal(state[key], true, "Candidate chain postcondition failed: " + key);

console.log(JSON.stringify({
  candidate_chronological_chain: "PASS",
  engine: "PostgreSQL 17",
  canonical_migration_count: canonicalFiles.length,
  staged_candidate_migration_count: candidateFiles.length,
  migration_count: files.length,
  migrations: files,
  postconditions: state,
  production_or_qa_modified: false,
}, null, 2));
