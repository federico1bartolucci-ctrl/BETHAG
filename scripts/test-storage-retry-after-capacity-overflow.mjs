import assert from "node:assert/strict";
import { createStorageRetryAfterFetch, readStorageRetryAfter } from "../src/lib/storageRetryAfterBridge.mjs";

const originalNow = Date.now;
let fakeNow = 1_800_000_000_000;
const paths = Array.from(
  { length: 513 },
  (_, index) => `workspace/temporary/overflow-${index}.pdf`,
);

const fetchWithRetryAfter = createStorageRetryAfterFetch(async () => new Response(
  JSON.stringify({ message: "Too Many Requests", statusCode: "429" }),
  {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": "120",
    },
  },
));

try {
  Date.now = () => fakeNow;

  for (const path of paths) {
    const response = await fetchWithRetryAfter(
      "https://project.supabase.co/storage/v1/object/bethag-documents",
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
      },
    );
    assert.equal(response.status, 429);
  }

  // The per-path map is deliberately capped at 512 entries. The first active
  // deadline is therefore evicted by the 513th unique path. Overflow handling
  // must preserve it through a bounded conservative fallback.
  const evictedPathRetryAfter = readStorageRetryAfter(null, paths[0]);
  assert.notEqual(evictedPathRetryAfter, null, "an active deadline must survive path-map overflow");
  assert.ok(
    Number(evictedPathRetryAfter) >= 119.9,
    "the evicted path must not retry before its 120-second server deadline",
  );

  // The fallback is intentionally conservative while overflow is active:
  // an untracked path may wait longer, but must never retry too early.
  const conservativeFallback = readStorageRetryAfter(null, "workspace/temporary/untracked.pdf");
  assert.notEqual(conservativeFallback, null);
  assert.ok(Number(conservativeFallback) >= 119.9);

  fakeNow += 121_000;
  assert.equal(
    readStorageRetryAfter(null, paths[0]),
    "0",
    "the fallback must stop imposing a positive delay after the server deadline",
  );

  fakeNow += 60_000;
  assert.equal(
    readStorageRetryAfter(null, paths[0]),
    null,
    "overflow metadata must expire after the bounded post-deadline retention period",
  );
} finally {
  Date.now = originalNow;
}

console.log("Storage Retry-After active-deadline overflow regression: PASS");
