import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const originalServe = Deno.serve;
let handler;
let invitedEmail;
let profilePayload;
let membershipPayload;

Deno.env.set("SUPABASE_URL", "https://mock.supabase.test");
Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_mock");
Deno.env.set("SUPABASE_SECRET_KEY", "sb_secret_mock");

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = String(init.method ?? "GET").toUpperCase();
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

  if (url.pathname === "/auth/v1/user" && method === "GET") {
    return json({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "admin@example.test", role: "authenticated" });
  }
  if (url.pathname === "/auth/v1/invite" && method === "POST") {
    const body = JSON.parse(String(init.body ?? "{}"));
    invitedEmail = body.email;
    return json({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      email: body.email,
      app_metadata: {},
      user_metadata: {},
    });
  }
  if (url.pathname === "/rest/v1/workspace_members" && method === "GET") {
    if (url.searchParams.get("role") === "eq.admin") {
      return json({ workspace_id: "workspace-test", role: "admin", active: true });
    }
    return json([]);
  }
  if (url.pathname === "/rest/v1/profiles" && method === "GET") return json([]);
  if (url.pathname === "/rest/v1/profiles" && method === "POST") {
    profilePayload = JSON.parse(String(init.body ?? "null"));
    return new Response(null, { status: 201 });
  }
  if (url.pathname === "/rest/v1/workspace_members" && method === "POST") {
    membershipPayload = JSON.parse(String(init.body ?? "null"));
    return new Response(null, { status: 201 });
  }
  throw new Error("Unexpected mocked Supabase request: " + method + " " + url.pathname + url.search);
};

Deno.serve = ((callback) => {
  handler = callback;
  return { finished: Promise.resolve() };
});

try {
  await import("../supabase/functions/bethag-invite-collaborator/index.ts?positive-collaborator-invite-test");
} finally {
  Deno.serve = originalServe;
}

assert.equal(typeof handler, "function", "Edge Function handler was not captured");

try {
  const response = await handler(new Request("https://mock.supabase.test/functions/v1/bethag-invite-collaborator", {
    method: "POST",
    headers: {
      Authorization: "Bearer mock-user-jwt",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceId: "workspace-test",
      legacyId: 901,
      name: "Collaboratore QA",
      email: "collaborator@example.test",
      permissions: ["condomini", "documenti", "scadenze", "ai", "invalid-permission"],
    }),
  }));

  const body = await response.json();
  assert.equal(response.status, 200, "Collaborator invitation should succeed: " + JSON.stringify(body));
  assert.equal(body.success, true);
  assert.equal(body.invited, true);
  assert.equal(invitedEmail, "collaborator@example.test");
  assert.equal(profilePayload.role, "collaborator");
  assert.equal(profilePayload.email, "collaborator@example.test");
  assert.deepEqual(membershipPayload.permissions, ["condomini", "documenti", "scadenze", "ai"]);
  assert.equal(membershipPayload.role, "collaborator");
  assert.equal(membershipPayload.workspace_id, "workspace-test");
  assert.equal(membershipPayload.legacy_id, 901);
  console.log("PASS: positive collaborator invitation, profile and workspace permissions");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("PASS: collaborator invite tested with mocked Auth/DB; no real email or project writes.");
