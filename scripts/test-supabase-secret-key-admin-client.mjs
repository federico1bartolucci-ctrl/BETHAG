import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSupabaseAdminClientOptions } from "../supabase/functions/_shared/supabase-admin-client-options.js";

const modernKey = "sb_secret_test_only";
let capturedRequest = null;
const modernOptions = createSupabaseAdminClientOptions(modernKey, async (request) => {
  capturedRequest = request;
  return new Response("ok", { status: 200 });
});

assert.deepEqual(modernOptions.auth, {
  persistSession: false,
  autoRefreshToken: false,
});
assert.equal(typeof modernOptions.global?.fetch, "function");

const requestBody = JSON.stringify({ id: "resident-1" });
const response = await modernOptions.global.fetch(
  new Request("https://project.example.test/rest/v1/profiles", {
    method: "POST",
    headers: {
      apikey: modernKey,
      Authorization: `Bearer ${modernKey}`,
      "Content-Type": "application/json",
      "x-bethag-trace": "preserve",
    },
    body: requestBody,
  }),
);

assert.equal(response.status, 200);
assert.ok(capturedRequest instanceof Request);
assert.equal(capturedRequest.headers.get("apikey"), modernKey, "modern secret key must remain in apikey");
assert.equal(capturedRequest.headers.get("Authorization"), null, "modern secret key must not be sent as a Bearer JWT");
assert.equal(capturedRequest.headers.get("Content-Type"), "application/json");
assert.equal(capturedRequest.headers.get("x-bethag-trace"), "preserve");
assert.equal(capturedRequest.method, "POST");
assert.equal(await capturedRequest.text(), requestBody, "request body must survive header sanitization");

const legacyKey = "eyJhbGciOiJIUzI1NiJ9.legacy-service-role-signature";
const legacyOptions = createSupabaseAdminClientOptions(legacyKey);
assert.deepEqual(legacyOptions.auth, {
  persistSession: false,
  autoRefreshToken: false,
});
assert.equal(legacyOptions.global, undefined, "legacy service_role JWT behavior must remain unchanged");

assert.throws(
  () => createSupabaseAdminClientOptions(""),
  /admin API key is required/,
);

const residentSource = await readFile(
  new URL("../supabase/functions/bethag-invite-resident/index.ts", import.meta.url),
  "utf8",
);
const collaboratorSource = await readFile(
  new URL("../supabase/functions/bethag-invite-collaborator/index.ts", import.meta.url),
  "utf8",
);

for (const [name, source] of [
  ["resident invitation", residentSource],
  ["collaborator invitation", collaboratorSource],
]) {
  assert.match(
    source,
    /import \{ createSupabaseAdminClientOptions \} from "\.\.\/_shared\/supabase-admin-client-options\.js"/,
    name + " must import the shared admin-key transport guard",
  );
  assert.match(
    source,
    /createClient\(supabaseUrl,\s*secretKey,\s*createSupabaseAdminClientOptions\(secretKey\)\)/,
    name + " must use the shared admin-key transport guard",
  );
  assert.doesNotMatch(
    source,
    /createClient\(supabaseUrl,\s*secretKey,\s*\{/,
    name + " must not construct an unguarded secret-key client",
  );
}

console.log("Supabase modern secret-key admin client transport regression: PASS");
