import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  resendWebhookErrorResponse,
  resendWebhookErrorStatus,
  resendWebhookEventResponse,
} from "../supabase/functions/_shared/resend-webhook-error-status.js";

const source = await readFile(new URL("../supabase/functions/bethag-resend-webhook/index.ts", import.meta.url), "utf8");
assert.match(source, /resendWebhookErrorResponse\("signature", error, headers\)/, "signature failures must use the tested 401 response helper");
assert.match(source, /resendWebhookErrorResponse\("payload", error, headers\)/, "payload parse failures must use the tested 400 response helper");
assert.match(source, /!value \|\| typeof value !== "object" \|\| Array\.isArray\(value\)/, "JSON null, primitives and arrays must be rejected as invalid webhook payload shapes");
assert.match(source, /resendWebhookErrorResponse\("processing", error, headers\)/, "processing failures must use the tested retryable 500 response helper");
assert.match(source, /return resendWebhookEventResponse\(result, headers\)/, "successful RPC results must pass through the tested event acknowledgement helper");

const headers = { "Content-Type": "application/json" };
assert.equal(resendWebhookErrorStatus("signature"), 401, "invalid signatures must not be acknowledged");
assert.equal(resendWebhookErrorStatus("payload"), 400, "invalid payloads must be rejected");
assert.equal(resendWebhookErrorStatus("processing"), 500, "RPC/database failures must trigger provider retry");
assert.equal(resendWebhookErrorStatus("body"), 500, "request body read failures must remain retryable");

const signatureResponse = resendWebhookErrorResponse("signature", new Error("invalid signature"), headers);
assert.equal(signatureResponse.status, 401);
assert.equal(signatureResponse.headers.get("content-type"), "application/json");
assert.deepEqual(await signatureResponse.json(), { error: "Firma webhook non valida." });

const payloadResponse = resendWebhookErrorResponse("payload", new SyntaxError("Unexpected token"), headers);
assert.equal(payloadResponse.status, 400);
assert.deepEqual(await payloadResponse.json(), { error: "Payload webhook non valido." });

const databaseResponse = resendWebhookErrorResponse("processing", new Error("PGRST transient failure"), headers);
assert.equal(databaseResponse.status, 500);
assert.deepEqual(await databaseResponse.json(), { error: "Errore elaborazione webhook." });

const missingRecipientResponse = resendWebhookEventResponse(
  { status: "ignored", reason: "recipient_not_found" },
  headers,
);
assert.equal(missingRecipientResponse.status, 503, "a provider event arriving before provider_message_id is committed must be retried");
assert.deepEqual(await missingRecipientResponse.json(), {
  error: "Destinatario non ancora registrato; riprovare l'evento.",
});

for (const result of [
  { status: "ignored", reason: "duplicate_status_event" },
  { status: "ignored", reason: "stale_status_event" },
  { status: "updated", communication_id: "communication-1" },
]) {
  const response = resendWebhookEventResponse(result, headers);
  assert.equal(response.status, 200, "duplicate, stale and applied events must be acknowledged to stop unnecessary retries");
  assert.deepEqual(await response.json(), result);
}

const emptyResponse = resendWebhookEventResponse(null, headers);
assert.equal(emptyResponse.status, 200);
assert.deepEqual(await emptyResponse.json(), { status: "ok" });

console.log("Resend webhook error and unmatched-recipient retry runtime regression: PASS");
