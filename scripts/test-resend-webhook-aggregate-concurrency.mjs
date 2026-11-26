import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261125054500_serialize_resend_webhook_communication_aggregate.sql";
const legacyPath = "supabase/rebuild/proposed-forward-migrations/20261123090000_guard_resend_webhook_status_event_order.sql";
const shellPath = "scripts/test-resend-webhook-aggregate-concurrency.sh";

const [migration, legacy, shell, packageJson] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(legacyPath, "utf8"),
  readFile(shellPath, "utf8"),
  readFile("package.json", "utf8").then(JSON.parse),
]);

assert.match(packageJson.scripts.test, /test-resend-webhook-aggregate-concurrency\.mjs/,
  "The aggregate-concurrency regression must be wired into npm test.");

const parentLock = migration.indexOf("PERFORM 1\n  FROM public.communications c");
const recipientLock = migration.indexOf("SELECT r.* INTO v_row", parentLock);
const aggregateSnapshot = migration.indexOf("SELECT jsonb_build_object(", recipientLock);
assert.ok(parentLock >= 0, "The fixed function must lock the communication parent.");
assert.ok(recipientLock > parentLock, "The parent communication lock must precede the recipient row lock.");
assert.ok(aggregateSnapshot > recipientLock, "The aggregate snapshot must be computed after both locks.");
assert.match(migration, /FOR UPDATE;/, "The parent and recipient locks must be row locks.");

assert.ok(legacy.indexOf("SELECT * INTO v_row") >= 0,
  "The legacy candidate must be present for before/after reproduction.");
assert.ok(shell.includes("LEGACY DEFECT REPRODUCED"),
  "The PostgreSQL harness must assert the stale aggregate on the legacy function.");
assert.ok(shell.includes("both recipients delivered"),
  "The PostgreSQL harness must verify both recipient outcomes.");
assert.ok(shell.includes("Consegnata"),
  "The PostgreSQL harness must assert the corrected aggregate.");
assert.ok(shell.includes("pg_stat_activity") && shell.includes("wait_event_type='Lock'"),
  "The PostgreSQL harness must wait for both concurrent sessions to reach the lock boundary.");

if (!process.env.DATABASE_URL) {
  console.log("SKIPPED: PostgreSQL concurrency execution requires DATABASE_URL; the PostgreSQL 17 workflow invokes this same npm-test module with an isolated database.");
} else {
  const result = spawnSync("bash", [shellPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "PostgreSQL Resend aggregate-concurrency regression failed.");
}
console.log("PASS: Resend aggregate-concurrency regression contract.");
