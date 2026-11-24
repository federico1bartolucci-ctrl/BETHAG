import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  resolveRecipientCount,
  summarizeCommunicationSendStatus,
} from "../supabase/functions/_shared/communication-send-summary.mjs";

const source = await readFile("supabase/functions/bethag-send-email/index.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(packageJson.scripts.test, /test-communication-send-summary\.mjs/, "Runtime regression must be wired into npm test.");
assert.match(source, /resolveRecipientCount\(count, recipientCountError\)/, "Idempotent count must use the checked count helper.");
assert.match(source, /recipientCountQueryFailed: true/, "Idempotent count failures must be surfaced.");
assert.match(source, /summarizeCommunicationSendStatus\(/, "Final send status must use the production summary helper.");
assert.match(source, /remainingCountError,/, "The remaining-recipient query error must be passed into status resolution.");
assert.match(source, /remainingCountQueryFailed: sendSummary\.remainingCountQueryFailed/, "The final response must expose count-query failure.");

const countError = new Error("simulated count query failure");
assert.deepEqual(resolveRecipientCount(null, countError), { ok: false, count: null });
assert.deepEqual(resolveRecipientCount(0), { ok: true, count: 0 });
assert.deepEqual(resolveRecipientCount(12), { ok: true, count: 12 });
assert.deepEqual(resolveRecipientCount(null), { ok: false, count: null });
assert.deepEqual(resolveRecipientCount(-1), { ok: false, count: null });
assert.deepEqual(resolveRecipientCount(Number.NaN), { ok: false, count: null });

assert.deepEqual(summarizeCommunicationSendStatus({
  sent: 2, failed: 0, statusPersistenceFailures: 0, remainingCount: null, remainingCountError: countError,
}), { status: "Errore", remaining: null, remainingCountQueryFailed: true });
assert.notEqual(summarizeCommunicationSendStatus({
  sent: 2, failed: 0, statusPersistenceFailures: 0, remainingCount: null, remainingCountError: countError,
}).status, "Inviata");
assert.deepEqual(summarizeCommunicationSendStatus({ sent: 1, remainingCount: 0 }), {
  status: "Inviata", remaining: 0, remainingCountQueryFailed: false,
});
assert.deepEqual(summarizeCommunicationSendStatus({ sent: 1, remainingCount: 3 }), {
  status: "Parzialmente inviata", remaining: 3, remainingCountQueryFailed: false,
});
assert.deepEqual(summarizeCommunicationSendStatus({ sent: 0, failed: 1, remainingCount: 0 }), {
  status: "Errore", remaining: 0, remainingCountQueryFailed: false,
});
assert.deepEqual(summarizeCommunicationSendStatus({ sent: 1, statusPersistenceFailures: 1, remainingCount: 0 }), {
  status: "Parzialmente inviata", remaining: 0, remainingCountQueryFailed: false,
});
assert.deepEqual(summarizeCommunicationSendStatus({ sent: 1, remainingCount: -1 }), {
  status: "Errore", remaining: null, remainingCountQueryFailed: true,
});

console.log("Communication recipient-count failure runtime regression: PASS");
