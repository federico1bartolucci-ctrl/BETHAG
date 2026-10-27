#!/usr/bin/env node
/**
 * End-to-end rehearsal of the SAME guarded canonical migration runner against
 * a local PostgreSQL database initialized from the five-file clean baseline.
 * Seeds a disposable copy of the frozen 244-pair ledger, runs all 11 real SQL
 * migrations through the production runner's local-only mode, then verifies
 * the exact 255-row result. Never accepts remote/Supabase DATABASE_URL values.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
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

const snapshot = JSON.parse(await readFile("supabase/rebuild/production-ledger-20261026.json", "utf8"));
assert.equal(snapshot.count, 244);
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
console.log("Seeded disposable local ledger with the frozen 244 version/name pairs.");

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

const finalLedger = JSON.parse(await psql(["-At","-c",
  "SELECT COALESCE(json_agg(json_build_object('version',version,'name',name) ORDER BY version),'[]'::json)::text FROM supabase_migrations.schema_migrations;"]));
assert.equal(finalLedger.length,255);
assert.deepEqual(finalLedger.slice(0,244),snapshot.migrations,"Historical ledger pairs changed.");
const manifest = JSON.parse(await readFile("supabase/rebuild/production-migration-cutover-freeze-20261027.json","utf8"));
assert.deepEqual(finalLedger.slice(244),manifest.sequence.map(m=>({version:m.file.slice(0,14),name:m.file.slice(15,-4})));
console.log(JSON.stringify({
 status:"PASS",
 test:"end-to-end canonical cutover runner rehearsal",
 target:"isolated local PostgreSQL 17",
 actual_migration_sql_files_executed:manifest.sequence.map(m=>m.file),
 frozen_historical_pairs_preserved:244,
 canonical_rows_added:11,
 final_ledger_rows:255,
 production_or_supabase_touched:false
},null,2));
