import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("supabase/functions/bethag-resend-webhook/index.ts", "utf8");
assert.match(source, /signature verification failed[\s\S]*?status:401/, "invalid webhook signatures return 401");
assert.match(source, /Payload webhook non valido[\s\S]*?status:400/, "malformed JSON returns 400");
assert.match(source, /processing error[\s\S]*?status:500/, "processing failures return retryable 500");
assert.match(source, /Provider retries on server errors/, "processing failures are documented as retryable");
console.log("Resend webhook retryability checks passed.");
