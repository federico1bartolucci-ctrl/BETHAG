import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { insertActivityWithUniqueLegacyId, nextActivityLegacyId } from "../src/lib/activityLegacyId.mjs";

const fixedNow = 1_795_000_000_000;

// Reproduce the actual workspace/legacy_id unique constraint with PostgreSQL semantics.
const db = new PGlite();
await db.exec(`
  CREATE TABLE activities (
    workspace_id text NOT NULL,
    legacy_id bigint,
    title text NOT NULL,
    CONSTRAINT activities_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
  );
`);
const oldFirstCreateId = fixedNow;
const oldSecondCreateId = fixedNow;
assert.equal(oldFirstCreateId, oldSecondCreateId, "the old Date.now() strategy produces the same legacy ID for same-millisecond creates");
await db.query("INSERT INTO activities(workspace_id, legacy_id, title) VALUES ($1, $2, $3)", ["workspace-old", oldFirstCreateId, "first"]);
await assert.rejects(
  db.query("INSERT INTO activities(workspace_id, legacy_id, title) VALUES ($1, $2, $3)", ["workspace-old", oldSecondCreateId, "second"]),
  error => error.code === "23505",
  "the second old-style insert must reproduce the database unique violation",
);

// Same-tab creates get distinct safe integer IDs even with a fixed clock/random source.
const firstLocalId = nextActivityLegacyId({ now: () => fixedNow, random: () => 0.25 });
const secondLocalId = nextActivityLegacyId({ now: () => fixedNow, random: () => 0.25 });
assert.notEqual(firstLocalId, secondLocalId, "same-tab creates must receive distinct monotonic IDs");
assert.ok(Number.isSafeInteger(firstLocalId) && Number.isSafeInteger(secondLocalId));

// Simulate another tab/device having claimed the next ID; the helper retries the exact constraint.
const collisionNow = fixedNow + 1000;
const collidingId = collisionNow * 1024 + Math.floor(0.5 * 1024);
await db.query("INSERT INTO activities(workspace_id, legacy_id, title) VALUES ($1, $2, $3)", ["workspace-retry", collidingId, "external writer"]);
let calls = 0;
const result = await insertActivityWithUniqueLegacyId({
  payload: { workspace_id: "workspace-retry", title: "Scadenza lavoro" },
  now: () => collisionNow,
  random: () => 0.5,
  insert: async row => {
    calls += 1;
    try {
      await db.query("INSERT INTO activities(workspace_id, legacy_id, title) VALUES ($1, $2, $3)", [row.workspace_id, row.legacy_id, row.title]);
      return { data: row, error: null };
    } catch (error) {
      return { error };
    }
  },
});
assert.equal(calls, 2, "only the known workspace legacy-ID collision is retried");
assert.equal(result.error, null);
assert.notEqual(result.data.legacy_id, collidingId, "retry must use a fresh legacy ID");

// Unrelated unique violations must not be retried.
let unrelatedCalls = 0;
const unrelated = await insertActivityWithUniqueLegacyId({
  payload: { workspace_id: "workspace-a", title: "Other conflict" },
  now: () => fixedNow + 1,
  random: () => 0.1,
  insert: async () => {
    unrelatedCalls += 1;
    return { error: { code: "23505", message: 'duplicate key violates constraint "activities_pkey"' } };
  },
});
assert.equal(unrelatedCalls, 1);
assert.equal(unrelated.error?.message.includes("activities_pkey"), true);

// Exhaustion returns the last unique error instead of masking it.
let collisionCalls = 0;
const exhausted = await insertActivityWithUniqueLegacyId({
  payload: { workspace_id: "workspace-a", title: "Repeated conflict" },
  now: () => fixedNow + 2,
  random: () => 0.2,
  maxAttempts: 3,
  insert: async () => {
    collisionCalls += 1;
    return { error: { code: "23505", message: 'duplicate key violates constraint "activities_workspace_legacy_unique"' } };
  },
});
assert.equal(collisionCalls, 3);
assert.equal(exhausted.error?.code, "23505");

await db.close();

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.ok(source.includes('import { insertActivityWithUniqueLegacyId } from "./lib/activityLegacyId.mjs";'));
const createFunctions = [
  source.slice(source.indexOf("async function createDeadlineActivity"), source.indexOf("async function recordProgressPayment")),
  source.slice(source.indexOf("async function createWorkActivity"), source.indexOf("async function createActivity")),
  source.slice(source.indexOf("async function createActivity(item:RegisterItem)"), source.indexOf("async function remove(")),
];
for (const fn of createFunctions) {
  assert.ok(fn.includes("insertActivityWithUniqueLegacyId("), "each activity creation path must use the collision-safe insert");
  assert.ok(!fn.includes("legacy_id:Date.now()"), "raw Date.now legacy IDs must be removed");
}

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-register-activity-legacy-id.mjs"));

console.log("PASS: Register activity creation reproduces the PostgreSQL unique collision and retries only the workspace legacy-ID constraint.");
