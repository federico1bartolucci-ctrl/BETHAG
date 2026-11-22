import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("supabase/functions/bethag-send-email/index.ts", "utf8");
assert.match(source, /statusPersistenceFailures/);
assert.match(source, /const \{ error: recipientStatusError \}/);
assert.match(source, /if \(recipientStatusError\) statusPersistenceFailures\+\+/);
assert.match(source, /communicationStatusPersistenceFailed: Boolean\(communicationStatusError\)/);
assert.match(source, /statusPersistenceFailures === 0/);
console.log("Email send-status persistence regression guard: PASS");
