import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  createStorageRetryAfterFetch,
  readStorageRetryAfter,
} from "../src/lib/storageRetryAfterBridge.mjs";
import { cleanupTemporaryStorageFiles } from "../src/lib/temporaryStorageCleanup.mjs";

const targetPath = "workspace/temporary/ai-source.pdf";
const waits = [];
const requests = [];
let sdkErrorShape = null;

const sdkFetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = String(init.method ?? input.method ?? "GET").toUpperCase();
  const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
  requests.push({ url, method, prefixes: body.prefixes });

  if (requests.length === 1) {
    return new Response(
      JSON.stringify({ message: "Too Many Requests", statusCode: "429" }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "0.5",
        },
      },
    );
  }

  return new Response(JSON.stringify([{ name: targetPath, id: "deleted-object" }]), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
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

const cleanup = await cleanupTemporaryStorageFiles(
  [targetPath],
  async (path) => {
    const { data, error } = await client.storage.from("bethag-documents").remove([path]);
    if (error) {
      // Supabase Storage SDK converts the Response to StorageApiError and drops
      // Response.headers. The fetch bridge must restore Retry-After by path.
      sdkErrorShape = {
        status: error.status,
        headers: error.headers,
        retryAfter: error.retryAfter,
      };
      const wrapped = new Error(error.message);
      wrapped.status = error.status;
      const retryAfter = readStorageRetryAfter(error, path);
      if (retryAfter !== undefined && retryAfter !== null) wrapped.retryAfter = retryAfter;
      throw wrapped;
    }
    assert.ok(Array.isArray(data), "successful Storage removal must return an array");
  },
  2,
  1,
  {
    baseDelayMs: 10,
    maxDelayMs: 1000,
    sleep: async (ms) => waits.push(ms),
    random: () => 0,
  },
);

assert.equal(cleanup.ok, true, "the retry must succeed after the SDK-stripped Retry-After is restored");
assert.equal(requests.length, 2, "the SDK must make one initial request and one delayed retry");
assert.equal(requests[0].method, "DELETE");
assert.deepEqual(requests[0].prefixes, [targetPath]);
assert.equal(waits.length, 1);
assert.ok(
  waits[0] > 0 && waits[0] <= 500,
  "the SDK error path must wait the remaining portion of the 500 ms server deadline",
);
assert.equal(sdkErrorShape.status, 429);
assert.equal(sdkErrorShape.headers, undefined, "StorageApiError does not retain the Response headers");
assert.equal(sdkErrorShape.retryAfter, undefined, "StorageApiError does not retain Retry-After itself");

// The bridge must not associate unrelated buckets' Retry-After headers with
// paths later passed to the BETHAG document cleanup helper.
for (const bucket of ["another-bucket", "bethag-documents-archive"]) {
  const otherPath = "workspace/" + bucket + "/temporary.pdf";
  const otherBucketFetch = createStorageRetryAfterFetch(async () => new Response(
    JSON.stringify({ message: "Too Many Requests", statusCode: "429" }),
    { status: 429, headers: { "content-type": "application/json", "retry-after": "2" } },
  ));
  await otherBucketFetch(
    "https://project.supabase.co/storage/v1/object/" + bucket,
    {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [otherPath] }),
    },
  );
  assert.equal(readStorageRetryAfter(null, otherPath), null);
}

console.log("Storage SDK Retry-After bridge runtime regression: PASS");
