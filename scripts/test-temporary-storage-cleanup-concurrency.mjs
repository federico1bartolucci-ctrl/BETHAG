import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cleanupTemporaryStorageFiles } from "../src/lib/temporaryStorageCleanup.mjs";

const paths = Array.from({ length: 23 }, (_, index) => "temporary-" + index + ".pdf");
let active = 0;
let maximumActive = 0;
let successfulRemovals = 0;
let overloadedAttempts = 0;

const boundedResult = await cleanupTemporaryStorageFiles(paths, async () => {
  active += 1;
  maximumActive = Math.max(maximumActive, active);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const overloaded = active > 5;
  active -= 1;
  if (overloaded) {
    overloadedAttempts += 1;
    const error = new Error("Storage rate limit exceeded");
    error.status = 429;
    throw error;
  }
  successfulRemovals += 1;
});

assert.equal(boundedResult.ok, true, "bounded cleanup must complete the multi-file batch");
assert.equal(boundedResult.results.length, paths.length);
assert.equal(successfulRemovals, paths.length);
assert.equal(maximumActive, 5, "the worker pool must cap concurrent removals at five");
assert.equal(overloadedAttempts, 0, "the bounded worker pool must avoid concurrency overload");
assert.equal(boundedResult.failures.length, 0);

// Reproduce the old immediate-retry failure while the server's Retry-After window is active.
let legacyElapsed = 0;
let legacyCalls = 0;
const rateLimitedRemove = async () => {
  legacyCalls += 1;
  if (legacyElapsed < 500) {
    const error = new Error("Storage rate limit window is still active");
    error.status = 429;
    error.retryAfter = "0.5";
    throw error;
  }
};
const legacyImmediateRetry = async () => {
  try {
    await rateLimitedRemove();
    return true;
  } catch {
    try {
      await rateLimitedRemove();
      return true;
    } catch {
      return false;
    }
  }
};
assert.equal(await legacyImmediateRetry(), false, "immediate retry must reproduce the active 429 window");
assert.equal(legacyCalls, 2);
assert.equal(legacyElapsed, 0, "legacy retries do not wait for Retry-After");

// The fixed helper waits for Retry-After before retrying the same object.
let elapsed = 0;
let calls = 0;
const waits = [];
const retryResult = await cleanupTemporaryStorageFiles(
  ["rate-limited.pdf"],
  async () => {
    calls += 1;
    if (elapsed < 500) {
      const error = new Error("Storage rate limit window is still active");
      error.status = 429;
      error.retryAfter = "0.5";
      throw error;
    }
  },
  3,
  1,
  {
    baseDelayMs: 10,
    maxDelayMs: 1000,
    sleep: async (ms) => { waits.push(ms); elapsed += ms; },
    random: () => 0,
  },
);
assert.equal(retryResult.ok, true);
assert.equal(calls, 2);
assert.deepEqual(waits, [500], "Retry-After seconds must be converted to milliseconds and respected");

// Also accept a Retry-After response header and preserve exponential fallback for 5xx.
let headerElapsed = 0;
let headerCalls = 0;
const headerWaits = [];
const headerResult = await cleanupTemporaryStorageFiles(
  ["header-rate-limited.pdf"],
  async () => {
    headerCalls += 1;
    if (headerElapsed < 250) {
      const error = new Error("Rate limited");
      error.status = 429;
      error.headers = { get: (name) => name.toLowerCase() === "retry-after" ? "0.25" : null };
      throw error;
    }
  },
  2,
  1,
  { baseDelayMs: 10, maxDelayMs: 1000, sleep: async (ms) => { headerWaits.push(ms); headerElapsed += ms; }, random: () => 0 },
);
assert.equal(headerResult.ok, true);
assert.equal(headerCalls, 2);
assert.deepEqual(headerWaits, [250]);

let fallbackCalls = 0;
const fallbackWaits = [];
const fallbackResult = await cleanupTemporaryStorageFiles(
  ["temporary-503.pdf"],
  async () => {
    fallbackCalls += 1;
    if (fallbackCalls === 1) {
      const error = new Error("Storage unavailable");
      error.status = 503;
      throw error;
    }
  },
  2,
  1,
  { baseDelayMs: 20, maxDelayMs: 100, sleep: async (ms) => fallbackWaits.push(ms), random: () => 0.5 },
);
assert.equal(fallbackResult.ok, true);
assert.deepEqual(fallbackWaits, [15], "5xx retries must use exponential backoff with jitter");

const exhaustedBudget = await cleanupTemporaryStorageFiles(
  ["too-long-retry-after.pdf"],
  async () => {
    const error = new Error("Retry window exceeds interactive cleanup budget");
    error.status = 429;
    error.retryAfter = "10";
    throw error;
  },
  3,
  1,
  { baseDelayMs: 10, maxDelayMs: 1000, sleep: async () => { throw new Error("must not sleep beyond the cleanup budget"); }, random: () => 0 },
);
assert.equal(exhaustedBudget.ok, false);
assert.equal(exhaustedBudget.failures[0].attempts, 1, "do not retry before a Retry-After longer than the cleanup budget");

const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
assert.ok(backend.includes("const retryAfter = (error as any).retryAfter"), "Storage Retry-After metadata must survive the production delete wrapper");
assert.ok(backend.includes("(cleanupError as any).retryAfter = retryAfter"), "the production cleanup error must expose Retry-After to the retry helper");

console.log("Temporary Storage bounded-concurrency and Retry-After backoff runtime regression: PASS");
