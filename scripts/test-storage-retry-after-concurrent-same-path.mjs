import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  createStorageRetryAfterFetch,
  readStorageRetryAfter,
} from "../src/lib/storageRetryAfterBridge.mjs";

const targetPath = "workspace/temporary/shared-ai-source.pdf";
const encoder = new TextEncoder();
let requestCount = 0;
const requestOrder = [];

function rateLimitedResponse(retryAfter, bodyDelayMs) {
  const body = new ReadableStream({
    start(controller) {
      setTimeout(() => {
        controller.enqueue(encoder.encode(JSON.stringify({
          message: "Too Many Requests",
          statusCode: "429",
        })));
        controller.close();
      }, bodyDelayMs);
    },
  });

  return new Response(body, {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": retryAfter,
    },
  });
}

const sdkFetch = async (input, init = {}) => {
  const index = ++requestCount;
  const url = typeof input === "string" ? input : input.url;
  const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
  requestOrder.push({ index, url, method: init.method, prefixes: body.prefixes });

  // The first HTTP response carries the shorter instruction but its body is
  // deliberately slow. The second response carries the longer instruction
  // and is parsed by storage-js first. This reverses error-consumption order.
  if (index === 1) return rateLimitedResponse("2", 80);
  if (index === 2) return rateLimitedResponse("5", 0);
  throw new Error("Unexpected extra Storage request.");
};

const client = createClient(
  "https://project.supabase.co",
  "test-publishable-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createStorageRetryAfterFetch(sdkFetch),
    },
  },
);

async function removeConcurrently(label) {
  const { data, error } = await client.storage
    .from("bethag-documents")
    .remove([targetPath]);

  assert.equal(data, null);
  assert.ok(error, "both concurrent Storage requests should be rate limited");
  assert.equal(error.status, 429);

  const retryAfter = readStorageRetryAfter(error, targetPath);
  const retryAfterMs = Number(retryAfter) * 1000;
  assert.ok(Number.isFinite(retryAfterMs), "the captured Retry-After must be numeric seconds");

  return { label, retryAfterMs };
}

const results = await Promise.all([
  removeConcurrently("slow-body-short-header"),
  removeConcurrently("fast-body-long-header"),
]);

assert.equal(requestCount, 2, "exactly two concurrent DELETE requests must be issued");
assert.ok(requestOrder.every((request) =>
  request.method === "DELETE" &&
  request.prefixes?.length === 1 &&
  request.prefixes[0] === targetPath
));

const shortResponse = results.find((result) => result.label === "slow-body-short-header");
const longResponse = results.find((result) => result.label === "fast-body-long-header");

assert.ok(shortResponse.retryAfterMs >= 1900, "the shorter server instruction must not be lost");
assert.ok(
  longResponse.retryAfterMs >= 4900,
  "the fast SDK error must not consume the shorter response's Retry-After value",
);
assert.ok(
  results.every((result) => result.retryAfterMs >= 4900),
  "concurrent errors for the same object must honor the strongest outstanding server deadline",
);

// A long server deadline must remain available beyond the old fixed 60-second
// metadata TTL. Otherwise a later cleanup retry could run before Retry-After.
const originalNow = Date.now;
let fakeNow = originalNow();
const longPath = "workspace/temporary/long-retry-after.pdf";
try {
  Date.now = () => fakeNow;
  const longRetryFetch = createStorageRetryAfterFetch(async () => new Response(
    JSON.stringify({ message: "Too Many Requests", statusCode: "429" }),
    {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "120" },
    },
  ));
  await longRetryFetch(
    "https://project.supabase.co/storage/v1/object/bethag-documents",
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [longPath] }),
    },
  );

  assert.equal(Number(readStorageRetryAfter(null, longPath)), 120);
  fakeNow += 61_000;
  assert.equal(
    Math.round(Number(readStorageRetryAfter(null, longPath)) * 1000),
    59_000,
    "a 120-second Retry-After must still be enforced after 61 seconds",
  );
} finally {
  Date.now = originalNow;
}

console.log("Storage concurrent same-path Retry-After association regression: PASS");
