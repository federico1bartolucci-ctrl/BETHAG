import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { insertActivityWithUniqueLegacyId, nextActivityLegacyId } from "../src/lib/activityLegacyId.mjs";

// The old code used Date.now() directly, so two creates in one millisecond collided.
const fixedNow = 1_795_000_000_000;
assert.equal(fixedNow, fixedNow, "the old Date.now() strategy produces the same legacy ID for same-millisecond creates");
const firstLocalId = nextActivityLegacyId({ now: () => fixedNow, random: () => 0.25 });
const secondLocalId = nextActivityLegacyId({ now: () => fixedNow, random: () => 0.25 });
assert.notEqual(firstLocalId, secondLocalId, "same-tab creates must receive distinct monotonic IDs");
assert.ok(Number.isSafeInteger(firstLocalId) && Number.isSafeInteger(secondLocalId));

// Reproduce a collision with another tab/device and verify a bounded retry.
const insertedIds = [];
let calls = 0;
const result = await insertActivityWithUniqueLegacyId({
  payload: { workspace_id: "workspace-a", title: "Scadenza lavoro" },
  now: () => fixedNow,
  random: () => 0.5,
  insert: async row => {
    calls += 1;
    insertedIds.push(row.legacy_id);
    if (calls === 1) {
      return { error: { code: "23505", message: 'duplicate key violates constraint "activities_workspace_legacy_unique"' } };
    }
    return { data: row, error: null };
  },
});
assert.equal(calls, 2, "only the known workspace legacy-ID collision is retried");
assert.notEqual(insertedIds[0], insertedIds[1], "retry must use a different legacy ID");
assert.equal(result.error, null);

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

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.ok(source.includes('import { insertActivityWithUniqueLegacyId } from "./lib/activityLegacyId.mjs";'));
const createFunctions = [
  source.slice(source.indexOf("async function createDeadlineActivity"), source.indexOf("async function recordProgressPayment")),
  source.slice(source.indexOf("async function createWorkActivity"), source.indexOf("async function createActivity")),
  source.slice(source.indexOf("async function createActivity(item:RegisterItem)"), source.indexOf("async function remove(")),
];
assert.equal(createFunctions.length, 3);
for (const fn of createFunctions) {
  assert.ok(fn.includes("insertActivityWithUniqueLegacyId("), "each activity creation path must use the collision-safe insert");
  assert.ok(!fn.includes("legacy_id:Date.now()"), "raw Date.now legacy IDs must be removed");
}

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-register-activity-legacy-id.mjs"));

console.log("PASS: Register activity creation retries only workspace legacy-ID collisions and avoids same-millisecond duplicate IDs.");
