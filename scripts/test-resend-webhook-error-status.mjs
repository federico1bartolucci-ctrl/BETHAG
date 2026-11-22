import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  resendWebhookErrorResponse,
  resendWebhookErrorStatus,
} from "../supabase/functions/_shared/resend-webhook-error-status.js";

const source = await readFile(new URL("../supabase/functions/bethag-resend-webhook/index.ts", import.meta.url), "utf8");
assert.match(source, /resendWebhookErrorResponse\("signature", error, headers\)/, "signature failures must use the tested 401 response helper");
assert.match(source, /resendWebhookErrorResponse\("payload", error, headers\)/, "payload parse failures must use the tested 400 response helper");
assert.match(source, /resendWebhookErrorResponse\("processing", error, headers\)/, "processing failures must use the tested retryable 500 response helper");

const headers = { "Content-Type": "application/json" };
assert.equal(resendWebhookErrorStatus("signature"), 401, "invalid signatures must not be acknowledged");
assert.equal(resendWebhookErrorStatus("payload"), 400, "invalid payloads must be rejected");
assert.equal(resendWebhookErrorStatus("processing"), 500, "RPC/database failures must trigger provider retry");
assert.equal(resendWebhookErrorStatus("body"), 500, "request body read failures must remain retryable");

const signatureResponse = resendWebhookErrorResponse("signature", new Error("invalid signature"), headers);
assert.equal(signatureResponse.status, 401);
assert.equal(signatureResponse.headers.get("content-type"), "application/json");
assert.deepEqual(await signatureResponse.json(), { error: "invalid signature" });

const payloadResponse = resendWebhookErrorResponse("payload", new SyntaxError("Unexpected token"), headers);
assert.equal(payloadResponse.status, 400);
assert.deepEqual(await payloadResponse.json(), { error: "Unexpected token" });

const databaseResponse = resendWebhookErrorResponse("processing", new Error("PGRST transient failure"), headers);
assert.equal(databaseResponse.status, 500);
assert.deepEqual(await databaseResponse.json(), { error: "PGRST transient failure" });

const unknownResponse = resendWebhookErrorResponse("unknown", "non-error rejection", headers);
assert.equal(unknownResponse.status, 500);
assert.deepEqual(await unknownResponse.json(), { error: "Errore elaborazione webhook." });

console.log("Resend webhook error response runtime regression: PASS");
