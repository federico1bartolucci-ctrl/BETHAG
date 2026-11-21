import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../supabase/functions/bethag-resend-webhook/index.ts", import.meta.url), "utf8");
assert.match(source, /let verificationFailed = false/);
assert.match(source, /let payloadParseFailed = false/);
assert.match(source, /verificationFailed = true/);
assert.match(source, /payloadParseFailed = true/);
assert.match(source, /const status = verificationFailed \? 401 : payloadParseFailed \? 400 : 500/);
assert.match(source, /status,headers/);
console.log("Resend webhook error status mapping: PASS");
