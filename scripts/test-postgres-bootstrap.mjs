import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const directory = "supabase/migrations";
const migrationFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];
const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
assert.deepEqual(actualFiles, migrationFiles, "The clean branch must contain only the five baseline migrations.");

function psql(args, input) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    input,
  });
}

const grantSql = await readFile(path.join(directory, migrationFiles[4]), "utf8");
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
  "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;",
  "CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;",
  "CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;",
  ...[...roles].sort().filter((role) => role !== "postgres").map((role) => {
    const identifier = role.replace(/"/g, '""');
    const literal = role.replace(/'/g, "''");
    return `DO $role$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${literal}') THEN CREATE ROLE "${identifier}" NOLOGIN; END IF; END $role$;`;
  }),
].join("\n");
psql(["-c", bootstrapSql]);

for (const filename of migrationFiles) {
  console.log(`Applying ${filename} to isolated PostgreSQL...`);
  psql(["-f", path.join(directory, filename)]);
}

const query = `
SELECT json_build_object(
  'tables', (SELECT count(*)::int FROM information_schema.tables WHERE table_schema IN ('public','private') AND table_type = 'BASE TABLE'),
  'columns', (SELECT count(*)::int FROM information_schema.columns WHERE table_schema IN ('public','private')),
  'constraints', (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private') AND c.contype <> 't'),
  'exclusion_constraints', (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private') AND c.contype = 'x'),
  'indexes', (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='i'),
  'views', (SELECT count(*)::int FROM information_schema.views WHERE table_schema IN ('public','private')),
  'functions', (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')),
  'policies', (SELECT count(*)::int FROM pg_policies WHERE schemaname IN ('public','private')),
  'rls_enabled_tables', (SELECT count(*)::int FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('public','private') AND t.relkind IN ('r','p') AND t.relrowsecurity),
  'triggers', (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND NOT t.tgisinternal),
  'btree_gist', (SELECT count(*)::int FROM pg_extension WHERE extname='btree_gist')
)::text;
`;
const result = psql(["-A", "-t", "-c", query], undefined).trim();
const inventory = JSON.parse(result);
const expected = {
  tables: 47,
  columns: 626,
  constraints: 304,
  exclusion_constraints: 1,
  indexes: 257,
  views: 1,
  functions: 171,
  policies: 103,
  rls_enabled_tables: 47,
  triggers: 146,
  btree_gist: 1,
};
assert.deepEqual(inventory, expected, "Real PostgreSQL baseline inventory differs from the Production catalog.");
console.log(JSON.stringify({ bootstrap: "PASS", engine: "PostgreSQL", inventory }, null, 2));
