import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const directory = "supabase/migrations";
const expectedFiles = [
  "20261017000001_bethag_baseline_schema.sql",
  "20261017000002_bethag_baseline_indexes_views.sql",
  "20261017000003_bethag_baseline_functions.sql",
  "20261017000004_bethag_baseline_security.sql",
  "20261017000005_bethag_baseline_grants.sql",
];

const actualFiles = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
assert.deepEqual(actualFiles, expectedFiles, "The clean branch must contain only the five ordered baseline migrations.");

const sql = Object.fromEntries(await Promise.all(expectedFiles.map(async (name) => [
  name,
  await readFile(`${directory}/${name}`, "utf8"),
])));
const count = (text, pattern) => (text.match(pattern) ?? []).length;

const result = {
  migration_files: actualFiles.length,
  tables: count(sql[expectedFiles[0]], /^CREATE TABLE /gm),
  constraints: count(sql[expectedFiles[0]], /^ALTER TABLE .* ADD CONSTRAINT /gm),
  indexes: count(sql[expectedFiles[1]], /^CREATE (?:UNIQUE )?INDEX /gm),
  views: count(sql[expectedFiles[1]], /^CREATE OR REPLACE VIEW /gm),
  functions: count(sql[expectedFiles[2]], /^CREATE OR REPLACE (?:FUNCTION|PROCEDURE)\b/gm),
  policies: count(sql[expectedFiles[3]], /^CREATE POLICY /gm),
  triggers: count(sql[expectedFiles[3]], /^CREATE (?:CONSTRAINT )?TRIGGER /gm),
  grants: count(sql[expectedFiles[4]], /^GRANT /gm) + count(sql[expectedFiles[4]], /^ALTER DEFAULT PRIVILEGES /gm),
};

assert.equal(result.tables, 47, "Production catalog table count changed.");
assert.equal(result.constraints, 304, "Production table-constraint count changed.");
assert.equal(result.indexes, 193, "Unexpected baseline index count.");
assert.equal(result.views, 1, "Expected the production fund-availability view.");
assert.equal(result.functions, 171, "Production function/procedure count changed.");
assert.equal(result.policies, 103, "Production RLS policy count changed.");
assert.equal(result.triggers, 146, "Production trigger count changed.");
assert.equal(result.grants, 905, "Production grants/default-privileges count changed.");

console.log(JSON.stringify({ baseline: "PASS", ...result }, null, 2));
