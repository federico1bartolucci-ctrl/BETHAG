#!/usr/bin/env node
/**
 * End-to-end rehearsal of the SAME guarded canonical migration runner against
 * a local PostgreSQL database initialized from the five-file clean baseline.
 * Seeds a disposable copy of the frozen 248-pair ledger, runs all 19 real SQL
 * migrations through the production runner's local-only mode, then verifies
 * the exact 267-row result. Never accepts remote/Supabase DATABASE_URL values.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const appEvidence = JSON.parse(await readFile("supabase/rebuild/qa-final-collaudo-20261105.json", "utf8"));
assert.ok(databaseUrl, "DATABASE_URL must point to the isolated local PostgreSQL rehearsal database.");
let target;
try { target = new URL(databaseUrl); } catch { throw new Error("Invalid DATABASE_URL."); }
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
  "Refusing non-local DATABASE_URL; this test is only for isolated local PostgreSQL.");
assert.ok(!/tctcgptrsmvgajqjgnev|supabase\.co/i.test(databaseUrl),
  "Refusing Supabase/Production connection URL.");

function psql(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
      env: process.env, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"]
    });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8").on("data", c => stdout += c);
    child.stderr.setEncoding("utf8").on("data", c => stderr += c);
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`psql exit ${code}: ${stderr || stdout}`)));
    if (input !== undefined) child.stdin.end(input);
  });
}
function q(v) { return "'" + String(v).replaceAll("'", "''") + "'"; }

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1").update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes])).digest("hex");
}

const baselineFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const baselineGrantSql = await readFile("supabase/migrations/" + baselineFiles[4], "utf8");
const roles = new Set(["anon", "authenticated", "service_role", "authenticator", "supabase_admin"]);
for (const pattern of [
  /\bTO\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
  /\bFOR\s+ROLE\s+(?:"((?:""|[^"])*)"|([a-z_][a-z0-9_$]*))/gi,
]) {
  for (const match of baselineGrantSql.matchAll(pattern)) {
    const role = (match[1] ?? match[2]).replace(/""/g, '"');
    if (!["PUBLIC", "public", "postgres"].includes(role)) roles.add(role);
  }
}
const bootstrapSql = [
  "CREATE SCHEMA IF NOT EXISTS auth;",
  "CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);",
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;",
  "CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;",
  "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;",
  ...[...roles].sort().filter((role) => role !== "postgres").map((role) => {
    const identifier = role.replace(/"/g, '""');
    const literal = role.replace(/'/g, "''");
    return "DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = " + q(literal) + ") THEN CREATE ROLE \"" + identifier + "\" NOLOGIN; END IF; END $role$;";
  }),
  "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT MAINTAIN ON TABLES TO anon, authenticated, service_role;",
].join("\n");

const existingPublicTables = Number(await psql(["-At", "-c",
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"]));
if (existingPublicTables === 0) {
  console.log("Preparing the separate runner database from the five clean baseline migrations...");
  await psql([], bootstrapSql);
  for (const filename of baselineFiles) {
    console.log("Applying baseline " + filename + " to runner-only PostgreSQL database...");
    await psql(["-f", "supabase/migrations/" + filename]);
  }
}

const snapshot = JSON.parse(await readFile("supabase/rebuild/production-ledger-20261105.json", "utf8"));
assert.equal(snapshot.count, 248);
const inventory = JSON.parse(await psql(["-At", "-c", `
SELECT json_build_object(
 'tables',(SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')),
 'functions',(SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p'))
)::text;`]));
assert.deepEqual(inventory, {tables:47, functions:171},
  "Refusing rehearsal unless the local database has the expected five-file BETHAG baseline.");

const seed = [
  "DROP SCHEMA IF EXISTS supabase_migrations CASCADE;",
  "CREATE SCHEMA supabase_migrations;",
  `CREATE TABLE supabase_migrations.schema_migrations (
    version text PRIMARY KEY NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
  );`,
  ...snapshot.migrations.reduce((chunks, row, i) => {
    if (i % 100 === 0) chunks.push([]);
    chunks[chunks.length - 1].push(`(${q(row.version)},${q(row.name)},NULL,NULL,NULL,NULL)`);
    return chunks;
  }, []).map(rows => "INSERT INTO supabase_migrations.schema_migrations(version,name,statements,created_by,idempotency_key,rollback) VALUES " + rows.join(",") + ";")
].join("\n");
await psql([], seed);
console.log("Seeded disposable local ledger with the frozen 248 version/name pairs.");

// Negative safety test: a historical manifest acceptance must not authorize
// Production apply without a fresh per-cutover operator reconfirmation.
// The runner must stop at the gate before attempting any PostgreSQL connection.
const blockedApply = spawn(process.execPath, ["scripts/apply-reviewed-production-migrations.mjs"], {
  env: {
    ...process.env,
    DATABASE_URL: "postgresql://postgres:unused@db.tctcgptrsmvgajqjgnev.supabase.co:5432/postgres",
    BETHAG_PRODUCTION_PROJECT_REF: "tctcgptrsmvgajqjgnev",
    BETHAG_EXPECTED_COMMIT_SHA: process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    BETHAG_QA_TESTED_COMMIT_SHA: appEvidence.reviewed_head_sha,
    BETHAG_ALLOW_PRODUCTION_MIGRATIONS: "YES",
    BETHAG_CUTOVER_PLAN_APPROVED: "YES",
    BETHAG_QA_APP_ACCEPTANCE_COMPLETE: "YES",
    BETHAG_QA_APP12_PROVIDER_VERIFIED: "YES",
    BETHAG_PRODUCTION_DATA_API_EXPOSURE_VERIFIED: "YES",
    BETHAG_PRODUCTION_BACKUP_VERIFIED: "",
    BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let blockedOut = "", blockedErr = "";
blockedApply.stdout.setEncoding("utf8").on("data", (chunk) => { blockedOut += chunk; });
blockedApply.stderr.setEncoding("utf8").on("data", (chunk) => { blockedErr += chunk; });
const blockedCode = await new Promise((resolve, reject) => {
  blockedApply.on("error", reject);
  blockedApply.on("close", resolve);
});
assert.notEqual(blockedCode, 0, "Production apply must fail closed without exact written cutover approval.");
assert.match(blockedErr + blockedOut,
  /BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED=YES|frozen manifest is still pending final cutover approval|BETHAG_CUTOVER_APPROVAL_NOT_RECORDED|application, migration, workflow or other non-documentation files changed after the tested QA SHA/,
  "Production apply must stop at the explicit approval gate before any database connection.");
console.log("PASS: pending cutover approval cannot pass the Production apply gate; runner stopped before any database connection.");


console.log("Applying existing canonical Production head (already included in frozen 248-row ledger) to clean local schema...");
await psql(["-f", "supabase/migrations/20261022202747_harden_close_member_transfer_search_path.sql"]);
const freeze = JSON.parse(await readFile("supabase/rebuild/production-migration-cutover-freeze-20261105.json", "utf8"));
for (const item of freeze.live_ledger.forward_migrations_after_2026_11_02_freeze) {
  const filename = item.file;
  const sql = await readFile("supabase/rebuild/production-forward-migrations/" + filename, "utf8");
  const cleanInstallSql = await readFile("supabase/migrations/" + filename, "utf8");
  assert.equal(gitBlobSha(cleanInstallSql), item.git_blob_sha, "Clean-install SQL copy differs from frozen Production-forward payload: " + filename);
  assert.equal(gitBlobSha(sql), item.git_blob_sha, "Production-forward SQL differs from frozen Git blob SHA: " + filename);
  console.log("Applying exact Production-forward SQL (ledger row already exists in frozen 248-pair snapshot): " + filename);
  await psql(["-f", "supabase/rebuild/production-forward-migrations/" + filename]);
}

const productionOnly = freeze.live_ledger.production_only_migration;
const productionOnlySql = await readFile("supabase/rebuild/production-forward-migrations/" + productionOnly.file, "utf8");
assert.equal(gitBlobSha(productionOnlySql), productionOnly.git_blob_sha,
  "Production-only migration replay differs from its captured reviewed Git blob: " + productionOnly.file);
console.log("Replaying already-applied Production-only migration (historical ledger row remains in the 248-row snapshot): " + productionOnly.file);
await psql(["-f", "supabase/rebuild/production-forward-migrations/" + productionOnly.file]);

console.log("Running read-only 248-row Production preflight against the reconstructed isolated schema...");
await psql(["-f", "supabase/rebuild/production-cutover-preflight-20261105.sql"]);

const runner = spawn(process.execPath, ["scripts/apply-reviewed-production-migrations.mjs"], {
  env: {...process.env, BETHAG_CUTOVER_REHEARSAL:"YES"},
  stdio:["ignore","pipe","pipe"]
});
let out="", err="";
runner.stdout.setEncoding("utf8").on("data", c => out += c);
runner.stderr.setEncoding("utf8").on("data", c => err += c);
const code = await new Promise((resolve,reject) => {
  runner.on("error",reject);
  runner.on("close",resolve);
});
if (code !== 0) throw new Error(`Canonical runner rehearsal failed (exit ${code}).\n${out}\n${err}`);
console.log(out);

console.log("Running read-only 267-row Production postflight against the reconstructed isolated schema...");
await psql(["-f", "supabase/rebuild/production-cutover-postflight-20261105.sql"]);

const finalLedger = JSON.parse(await psql(["-At","-c",
  "SELECT COALESCE(json_agg(json_build_object('version',version,'name',name) ORDER BY version),'[]'::json)::text FROM supabase_migrations.schema_migrations;"]));
assert.equal(finalLedger.length,267);
const historicalVersions = new Set(snapshot.migrations.map(row=>row.version));
assert.deepEqual(finalLedger.filter(row=>historicalVersions.has(row.version)),snapshot.migrations,"Historical ledger pairs changed.");
const manifest = JSON.parse(await readFile("supabase/rebuild/production-migration-cutover-freeze-20261105.json","utf8"));
assert.deepEqual(finalLedger.filter(row=>!historicalVersions.has(row.version)),manifest.sequence.map(m=>({version:m.file.slice(0,14),name:m.file.slice(15,-4)})));
console.log(JSON.stringify({
 status:"PASS",
 test:"end-to-end canonical cutover runner rehearsal",
 target:"isolated local PostgreSQL 17",
 actual_migration_sql_files_executed:manifest.sequence.map(m=>m.file),
 frozen_historical_pairs_preserved:248,
 canonical_rows_added:19,
 final_ledger_rows:267,
 production_or_supabase_touched:false
},null,2));
