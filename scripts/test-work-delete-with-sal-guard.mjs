import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const migrationPath = "supabase/rebuild/drafts/20261124202340_prevent_work_delete_with_progress.sql";
const regressionPath = "scripts/work-delete-with-sal-guard-regression.sql";
const migration = await readFile(migrationPath, "utf8");
const regression = await readFile(regressionPath, "utf8");
const canonicalMigrations = await readdir("supabase/migrations");

assert.ok(!canonicalMigrations.includes("20261124202340_prevent_work_delete_with_progress.sql"),
  "The unapproved work/SAL guard must remain outside the deployable migration inventory.");
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.prevent_work_delete_with_progress\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path TO ''[\s\S]*SET row_security TO off/);
assert.match(migration, /WHERE p\.work_id = OLD\.id/);
assert.doesNotMatch(migration, /p\.workspace_id\s*=\s*OLD\.workspace_id|p\.condominium_id\s*=\s*OLD\.condominium_id/);
assert.match(migration, /BEFORE DELETE ON public\.condominium_works[\s\S]*EXECUTE FUNCTION public\.prevent_work_delete_with_progress/);
assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.prevent_work_delete_with_progress\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
assert.ok(regression.includes("\\i " + migrationPath), "The runtime regression must apply the draft migration.");
assert.ok(regression.includes("SET ROLE authenticated"), "The test must exercise an application role.");
assert.ok(regression.includes("LEGACY DEFECT REPRODUCED") && regression.includes("PASS: work deletion blocks every cascading SAL child"));
assert.ok(regression.includes("ROLLBACK;"), "All test objects and ACL changes must be rolled back.");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIPPED: PostgreSQL runtime requires DATABASE_URL; static work/SAL guard contract passed.");
} else {
  const target = new URL(url);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
    "Only disposable loopback PostgreSQL may run the work/SAL deletion regression.");
  assert.ok(!url.includes("supabase.co") && !url.includes("tctcgptrsmvgajqjgnev") && !url.includes("jhuyhlzzydcgghrzeexn"),
    "Remote Supabase/Production targets are forbidden.");
  execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", url, "-v", "ON_ERROR_STOP=1", "-f", regressionPath], {
    stdio: "inherit",
  });
  console.log("PASS: work deletion preserves every linked SAL under PostgreSQL 17 RLS; local disposable database only.");
}
