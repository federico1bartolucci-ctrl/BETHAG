import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("supabase/functions/bethag-send-email/index.ts", "utf8");

assert.match(source, /let sent = 0, failed = 0, persistenceFailures = 0;/, "send handler tracks status persistence failures");
assert.equal((source.match(/const \{ error: recipientStatusError \}/g) ?? []).length, 3, "all recipient-status writes capture Supabase errors");
assert.equal((source.match(/if \(recipientStatusError\) \{/g) ?? []).length, 3, "all recipient-status write errors are handled");
assert.match(source, /const \{ count: remaining, error: remainingError \}/, "remaining recipient count query captures its error");
assert.match(source, /if \(remainingError\) \{/, "remaining recipient query errors are reported");
assert.match(source, /const \{ error: communicationStatusError \}/, "communication status write captures its error");
assert.match(source, /if \(communicationStatusError\) \{/, "communication status write errors are reported");
assert.match(source, /persistenceWarning:/, "API response warns when delivery-state persistence fails");
assert.match(source, /I messaggi inviati non devono essere reinviati manualmente senza verifica/, "warning prevents unsafe blind retries");
console.log("Email status persistence error checks passed.");
