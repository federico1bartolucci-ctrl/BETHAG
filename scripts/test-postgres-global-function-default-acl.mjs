import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const migrationPath = "supabase/rebuild/drafts/20261124234000_revoke_postgres_global_public_function_execute.sql";
const regressionPath = "scripts/postgres-global-function-default-acl-regression.sql";
const migration = await readFile(migrationPath, "utf8");
const regression = await readFile(regressionPath, "utf8");
const canonicalMigrations = await readdir("supabase/migrations");

assert.ok(!canonicalMigrations.includes("20261124234000_revoke_postgres_global_public_function_execute.sql"),
  "The unapproved ACL proposal must remain outside the deployable Supabase migration inventory.");
assert.match(migration, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;/,
  "The proposal must revoke the global postgres function EXECUTE defaults for PUBLIC and application roles.");
assert.match(regression, /CREATE FUNCTION private\.bethag_acl_before_probe/);
assert.match(regression, /LEGACY DEFECT REPRODUCED|Expected PostgreSQL built-in global PUBLIC EXECUTE before repair/);
assert.match(regression, /\\i supabase\/rebuild\/drafts\/20261124234000_revoke_postgres_global_public_function_execute\.sql[\s\S]*\\i supabase\/rebuild\/drafts\/20261124234000_revoke_postgres_global_public_function_execute\.sql/,
  "The isolated PostgreSQL regression must apply the proposal twice to prove idempotency.");
assert.match(regression, /Intentional storage schema-specific grants were not preserved/);
assert.match(regression, /Supabase-managed supabase_admin defaults changed/);
assert.match(regression, /ROLLBACK;/, "The isolated regression must roll back all test data and ACL changes.");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIPPED: PostgreSQL runtime requires DATABASE_URL; static draft-scope contract passed.");
} else {
  const target = new URL(url);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
    "Only disposable loopback PostgreSQL may run the ACL proposal regression.");
  assert.ok(!url.includes("supabase.co") && !url.includes("tctcgptrsmvgajqjgnev") && !url.includes("jhuyhlzzydcgghrzeexn"),
    "Remote Supabase/Production targets are forbidden.");
  execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1", "-f", regressionPath], {
    stdio: "inherit",
  });
  console.log("PASS: PostgreSQL 17 global function default ACL regression; local transaction rolled back.");
}
