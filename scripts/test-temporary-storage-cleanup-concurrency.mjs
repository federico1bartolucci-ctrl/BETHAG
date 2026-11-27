import assert from "node:assert/strict";
import { cleanupTemporaryStorageFiles } from "../src/lib/temporaryStorageCleanup.mjs";

const paths = Array.from({ length: 23 }, (_, index) => `temporary-${index}.pdf`);
let active = 0;
let maximumActive = 0;
let successfulRemovals = 0;

const result = await cleanupTemporaryStorageFiles(paths, async () => {
  active += 1;
  maximumActive = Math.max(maximumActive, active);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const overloaded = active > 5;
  active -= 1;
  if (overloaded) {
    const error = new Error("Storage rate limit exceeded");
    error.status = 429;
    throw error;
  }
  successfulRemovals += 1;
});

assert.equal(result.ok, true, "bounded cleanup must complete despite Storage rate limiting");
assert.equal(result.results.length, paths.length);
assert.equal(successfulRemovals, paths.length);
assert.equal(maximumActive, 5, "the worker pool must cap concurrent removals at five");
assert.ok(result.failures.length === 0);

console.log("Temporary Storage cleanup bounded-concurrency runtime regression: PASS");
