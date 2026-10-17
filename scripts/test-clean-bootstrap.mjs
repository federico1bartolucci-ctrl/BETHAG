import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

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

const migrations = await Promise.all(migrationFiles.map((name) => readFile(`${directory}/${name}`, "utf8")));
const [schemaSql, indexSql, functionSql, securitySql, grantSql] = migrations;
const count = (text, pattern) => (text.match(pattern) ?? []).length;
const inventory = {
  migration_files: actualFiles.length,
  tables: count(schemaSql, /^CREATE TABLE /gm),
  constraints: count(schemaSql, /^ALTER TABLE .* ADD CONSTRAINT /gm),
  indexes: count(indexSql, /^CREATE (?:UNIQUE )?INDEX /gm),
  views: count(indexSql, /^CREATE OR REPLACE VIEW /gm),
  functions: count(functionSql, /^CREATE OR REPLACE (?:FUNCTION|PROCEDURE)\b/gm),
  policies: count(securitySql, /^CREATE POLICY /gm),
  triggers: count(securitySql, /^CREATE (?:CONSTRAINT )?TRIGGER /gm),
  grants: count(grantSql, /^GRANT /gm) + count(grantSql, /^ALTER DEFAULT PRIVILEGES /gm),
};
assert.deepEqual(inventory, {
  migration_files: 5, tables: 47, constraints: 305, indexes: 193, views: 1,
  functions: 171, policies: 103, triggers: 146, grants: 905,
}, "Baseline object inventory differs from the captured Production catalog.");

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
  `);

  const roles = new Set(["anon", "authenticated", "service_role", "authenticator", "supabase_admin"]);
  for (const match of grantSql.matchAll(/\bTO\s+("(?:""|[^"])+")/g)) {
    const role = match[1].slice(1, -1).replace(/""/g, '"');
    if (role.toUpperCase() !== "PUBLIC" && role !== "postgres") roles.add(role);
  }
  for (const match of grantSql.matchAll(/\bFOR ROLE\s+("(?:""|[^"])+")/g)) {
    const role = match[1].slice(1, -1).replace(/""/g, '"');
    if (role !== "postgres") roles.add(role);
  }
  for (const role of [...roles].sort()) {
    const existing = await db.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    if (existing.rows.length === 0) {
      await db.exec(`CREATE ROLE "${role.replace(/"/g, '""')}"`);
    }
  }

  for (let i = 0; i < migrations.length; i += 1) {
    try {
      await db.exec(migrations[i]);
    } catch (error) {
      throw new Error(`Baseline migration ${migrationFiles[i]} failed: ${error.message}`, { cause: error });
    }
  }

  const [tableCount, functionCount, policyCount, triggerCount, viewCount] = await Promise.all([
    db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema IN ('public','private') AND table_type='BASE TABLE'"),
    db.query("SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')"),
    db.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname IN ('public','private')"),
    db.query("SELECT count(*)::int AS n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND NOT t.tgisinternal"),
    db.query("SELECT count(*)::int AS n FROM information_schema.views WHERE table_schema IN ('public','private')"),
  ]);
  assert.equal(tableCount.rows[0].n, 47, "Fresh bootstrap table count mismatch.");
  assert.equal(functionCount.rows[0].n, 171, "Fresh bootstrap function count mismatch.");
  assert.equal(policyCount.rows[0].n, 103, "Fresh bootstrap RLS policy count mismatch.");
  assert.equal(triggerCount.rows[0].n, 146, "Fresh bootstrap trigger count mismatch.");
  assert.equal(viewCount.rows[0].n, 1, "Fresh bootstrap view count mismatch.");
  console.log(JSON.stringify({ bootstrap: "PASS", inventory, roles_created: roles.size }, null, 2));
} finally {
  await db.close();
}
