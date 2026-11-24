import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sendEmailMethodResponse } from "../supabase/functions/_shared/send-email-method-response.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const options = sendEmailMethodResponse("OPTIONS", corsHeaders);
assert.ok(options instanceof Response);
assert.equal(options.status, 200);
assert.equal(await options.text(), "ok");
assert.equal(options.headers.get("Access-Control-Allow-Origin"), "*");

for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE"]) {
  const response = sendEmailMethodResponse(method, corsHeaders);
  assert.ok(response instanceof Response, method + " must receive a response");
  assert.equal(response.status, 405, method + " must be rejected");
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(await response.json(), { error: "Metodo non consentito." });
}

assert.equal(sendEmailMethodResponse("POST", corsHeaders), null, "POST must continue to handler");
const handler = await readFile(new URL("../supabase/functions/bethag-send-email/index.ts", import.meta.url), "utf8");
assert.match(handler, /sendEmailMethodResponse\(req\.method,\s*corsHeaders\)/, "handler must use tested method guard");
assert.match(handler, /if \(methodResponse\) return methodResponse;/, "handler must stop on method guard response");

console.log("send-email method guard runtime regression: PASS");
