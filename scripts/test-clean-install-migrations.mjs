#!/usr/bin/env node
/**
 * Full chronological clean-install rehearsal for the exact deployable BETHAG
 * migration directory. This is separate from the live-Production cutover
 * rehearsal, whose fourteen pending increments are applied after the existing
 * 247-row ledger state.
 *
 * The target must be a disposable local PostgreSQL 17 database. Never pass a
 * Supabase URL or a remote database connection string.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to a disposable local PostgreSQL database.");
let target;
try { target = new URL(databaseUrl); } catch { throw new Error("Invalid DATABASE_URL."); }
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
  "Refusing non-local DATABASE_URL; clean-install test must never touch Supabase or Production.");

function psql(args, input) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    input,
  });
}

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes])).digest("hex");
}

const root = "supabase";
const migrationDirectory = root + "/migrations";
const baselineFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const existingHead = "20261022202747_harden_close_member_transfer_search_path.sql";
const freeze = JSON.parse(await readFile(root + "/rebuild/production-migration-cutover-freeze-20261103.json", "utf8"));
const pendingFiles = freeze.sequence.map((item) => item.file);
const forwardItems = freeze.live_ledger.forward_migrations_after_2026_11_02_freeze;
const forwardFiles = forwardItems.map((item) => item.file);
const expectedFiles = [...baselineFiles, existingHead, ...pendingFiles, ...forwardFiles].sort();
const actualFiles = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();

assert.equal(freeze.clean_install?.migration_file_count, 23,
  "Frozen manifest must describe the 23-file clean-install sequence.");
assert.deepEqual(freeze.clean_install.baseline_files, baselineFiles);
assert.equal(freeze.clean_install.existing_canonical_head, existingHead);
assert.deepEqual(freeze.clean_install.pending_canonical_increments, pendingFiles);
assert.deepEqual(freeze.clean_install.exact_production_forward_files, forwardFiles);
assert.deepEqual(actualFiles, expectedFiles,
  "Deployable migration directory differs from the frozen 23-file chronological clean-install sequence.");
assert.equal(actualFiles.length, 23);
assert.equal(new Set(actualFiles.map((name) => name.slice(0, 14))).size, 23,
  "Clean-install migration versions must be unique.");

for (const item of freeze.sequence) {
  const sql = await readFile(migrationDirectory + "/" + item.file, "utf8");
  assert.equal(gitBlobSha(sql), item.git_blob_sha,
    "Pending canonical SQL differs from its frozen reviewed hash: " + item.file);
}
for (const item of forwardItems) {
  const sql = await readFile(migrationDirectory + "/" + item.file, "utf8");
  assert.equal(gitBlobSha(sql), item.git_blob_sha,
    "Clean-install Production-forward SQL differs from the exact applied Production-ledger payload: " + item.file);
}

const grantSql = await readFile(migrationDirectory + "/" + baselineFiles[4], "utf8");
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
  "CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);",
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

console.log("Bootstrapping isolated PostgreSQL with Supabase Auth role/function prerequisites...");
psql(["-c", bootstrapSql]);

for (const filename of actualFiles) {
  console.log("Applying chronological clean-install migration " + filename);
  psql(["-f", migrationDirectory + "/" + filename]);
}

const query = [
"SELECT json_build_object(",
"  'public_tables', (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),",
"  'application_maintain_relations', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND (has_table_privilege('anon',c.oid,'MAINTAIN') OR has_table_privilege('authenticated',c.oid,'MAINTAIN') OR has_table_privilege('service_role',c.oid,'MAINTAIN'))),",
"  'postgres_default_maintain', (SELECT count(*)::int FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype='r' AND n.nspname='public' AND a.privilege_type='MAINTAIN' AND a.grantee IN ('anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),",
"  'transfer_wrapper_invoker', (SELECT NOT p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='close_condominium_member_transfer' AND pg_get_function_identity_arguments(p.oid)='p_transfer_id uuid'),",
"  'private_schema_service_role_usage', has_schema_privilege('service_role','private','USAGE'),",
"  'prepare_communication_authenticated', has_function_privilege('authenticated','private.prepare_communication_recipients(uuid)','EXECUTE'),",
"  'reset_stale_communication_authenticated', has_function_privilege('authenticated','private.reset_stale_communication_recipients(uuid,interval)','EXECUTE'),",
"  'resend_event_service_role', has_function_privilege('service_role','private.apply_resend_communication_event(text,text,text,text,timestamptz)','EXECUTE'),",
"  'resend_event_authenticated', has_function_privilege('authenticated','private.apply_resend_communication_event(text,text,text,text,timestamptz)','EXECUTE'),",
"  'resend_event_anon', has_function_privilege('anon','private.apply_resend_communication_event(text,text,text,text,timestamptz)','EXECUTE'),",
"  'workspace_members_data', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data'),",
"  'save_condominium_preserves_archive', position('archive_reason' IN coalesce(pg_get_functiondef(to_regprocedure('private.save_condominium(uuid,bigint,text,text,text,text,text,jsonb)')),'')) > 0",
")::text;"
].join("\n");
const state = JSON.parse(psql(["-A", "-t", "-c", query]).trim());

assert.equal(state.public_tables, 47, "Unexpected public table inventory after clean install.");
assert.equal(state.application_maintain_relations, 0, "Application roles retain MAINTAIN on public relations.");
assert.equal(state.postgres_default_maintain, 0, "Postgres default privileges still grant MAINTAIN to application roles.");
assert.equal(state.transfer_wrapper_invoker, true, "Public transfer wrapper is not SECURITY INVOKER.");
assert.equal(state.private_schema_service_role_usage, true, "service_role lacks private schema USAGE.");
assert.equal(state.prepare_communication_authenticated, true, "Authenticated caller cannot prepare communication recipients.");
assert.equal(state.reset_stale_communication_authenticated, true, "Authenticated caller cannot reset stale communication recipients.");
assert.equal(state.resend_event_service_role, true, "service_role cannot invoke the private Resend event RPC.");
assert.equal(state.resend_event_authenticated, false, "Authenticated role can invoke the private Resend event RPC.");
assert.equal(state.resend_event_anon, false, "anon can invoke the private Resend event RPC.");
assert.equal(state.workspace_members_data, true, "workspace_members.data is missing.");
assert.equal(state.save_condominium_preserves_archive, true, "save_condominium does not preserve server-owned archive metadata.");

console.log(JSON.stringify({
  status: "PASS",
  test: "complete chronological BETHAG clean-install migration replay",
  target: "isolated local PostgreSQL 17",
  migration_files_applied: actualFiles.length,
  baseline_files: baselineFiles.length,
  existing_canonical_head: 1,
  pending_canonical_increments: pendingFiles.length,
  exact_production_forward_files: forwardFiles.length,
  postconditions: state,
  remote_supabase_or_production_touched: false
}, null, 2));
