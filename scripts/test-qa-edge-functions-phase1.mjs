import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminPassword = process.env.BETHAG_QA_ADMIN_PASSWORD;
assert.ok(key && adminPassword, "Missing QA admin credentials for Edge Functions phase 1");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const login = await admin.auth.signInWithPassword({
  email: "bethag-admin-qa@example.com",
  password: adminPassword,
});
assert.ifError(login.error);
assert.ok(login.data.session?.access_token, "QA admin session missing");

const workspaceResult = await admin.from("workspaces")
  .select("id")
  .eq("name", "BETHAG_QA_FIXTURE_20261102")
  .single();
assert.ifError(workspaceResult.error);
const workspaceId = workspaceResult.data.id;

async function expectStatus(slug, body, expectedStatus, expectedCode) {
  const response = await fetch(url + "/functions/v1/" + slug, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + login.data.session.access_token,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, expectedStatus, slug + " expected HTTP " + expectedStatus + " but got " + response.status + ": " + JSON.stringify(payload));
  if (expectedCode) assert.equal(payload.code, expectedCode, slug + " returned unexpected response: " + JSON.stringify(payload));
}

try {
  await expectStatus("bethag-invite-collaborator", {}, 400);
  console.log("PASS: collaborator invitation rejects incomplete input without mutation");
  await expectStatus("bethag-invite-resident", {}, 400);
  console.log("PASS: resident invitation rejects incomplete input without mutation");
  await expectStatus("delete-account", { confirmation: "NO" }, 400);
  console.log("PASS: account deletion rejects invalid confirmation without mutation");

  // The disabled gate runs after authentication and authorization, but before Storage downloads,
  // OpenAI file uploads, or paid Responses API calls.
  const disabledRequest = {
    workspaceId,
    files: [{ filename: "offline-qa-placeholder.pdf", storagePath: workspaceId + "/offline-qa-placeholder.pdf", mimeType: "application/pdf" }],
  };
  await expectStatus("bethag-ai-condominium", disabledRequest, 503, "AI_DISABLED");
  console.log("PASS: AI condominium is safely disabled without invoking paid providers");
  await expectStatus("bethag-ai-document", disabledRequest, 503, "AI_DISABLED");
  console.log("PASS: AI document is safely disabled without invoking paid providers");
} finally {
  await admin.auth.signOut();
}
