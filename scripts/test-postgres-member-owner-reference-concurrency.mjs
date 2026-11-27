import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;
const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261127060000_atomic_condominium_member_owner_reference_sync.sql";
const shellPath = "scripts/test-member-owner-reference-concurrency.sh";
const [migration, shell, packageJson] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(shellPath, "utf8"),
  readFile("package.json", "utf8").then(JSON.parse),
]);

assert.match(migration, /FOR UPDATE/);
assert.match(migration, /SECURITY INVOKER/);
assert.match(migration, /ORDER BY u\.id[\s\S]*FOR UPDATE/);
assert.match(shell, /LEGACY DEFECT REPRODUCED/);
assert.match(shell, /both concurrent owners retained/);
assert.match(shell, /pg_stat_activity/);
assert.match(packageJson.scripts.test, /test-member-owner-reference-sync-runtime\.mjs/);

if (!databaseUrl) {
  console.log("SKIPPED: PostgreSQL 17 owner-reference concurrency execution requires the isolated CI DATABASE_URL.");
} else {
  const target = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname),
    "Refusing non-local DATABASE_URL; this regression may only touch disposable local PostgreSQL.");
  assert.equal(target.pathname.replace(/^\//, ""), "bethag_clean_install_test",
    "This regression may only modify the disposable clean-install database.");
  const workspaceId = "f1000000-0000-4000-8000-000000000001";
  const condominiumId = "f1000000-0000-4000-8000-000000000002";
  const unitId = "f1000000-0000-4000-8000-000000000003";
  const memberAId = "f1000000-0000-4000-8000-000000000004";
  const memberBId = "f1000000-0000-4000-8000-000000000005";
  const unitBId = "f1000000-0000-4000-8000-000000000006";
  const userId = "f1000000-0000-4000-8000-000000000007";
  const legacyA = String(Date.now() * 10 + 1);
  const legacyB = String(Date.now() * 10 + 2);
  const result = spawnSync("bash", [shellPath], {
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      OWNER_SYNC_TEST_WORKSPACE_ID: workspaceId,
      OWNER_SYNC_TEST_CONDOMINIUM_ID: condominiumId,
      OWNER_SYNC_TEST_UNIT_ID: unitId,
      OWNER_SYNC_TEST_MEMBER_A_ID: memberAId,
      OWNER_SYNC_TEST_MEMBER_B_ID: memberBId,
      OWNER_SYNC_TEST_UNIT_B_ID: unitBId,
      OWNER_SYNC_TEST_USER_ID: userId,
      OWNER_SYNC_TEST_LEGACY_A: legacyA,
      OWNER_SYNC_TEST_LEGACY_B: legacyB,
    },
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "PostgreSQL 17 member owner-reference concurrency regression failed.");
}

console.log("PASS: PostgreSQL member owner-reference concurrency regression contract.");
