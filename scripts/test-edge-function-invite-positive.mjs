import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const originalServe = Deno.serve;
let handler;
let memberRole = "Proprietario";
let portalPayload;
let invitedEmail;

Deno.env.set("SUPABASE_URL", "https://mock.supabase.test");
Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_mock");
Deno.env.set("SUPABASE_SECRET_KEY", "sb_secret_mock");

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = String(init.method ?? "GET").toUpperCase();
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (url.pathname === "/auth/v1/user" && method === "GET") return json({ id: "qa-admin-id", email: "admin@example.test", role: "authenticated" });
  if (url.pathname === "/auth/v1/invite" && method === "POST") {
    const body = JSON.parse(String(init.body ?? "{}")); invitedEmail = body.email;
    return json({ id: "qa-invited-" + memberRole.toLowerCase(), email: body.email, app_metadata: {}, user_metadata: {} });
  }
  if (url.pathname.startsWith("/auth/v1/admin/users/") && method === "PUT") return json({ id: url.pathname.split("/").pop() });
  if (url.pathname === "/rest/v1/workspace_members" && method === "GET") return json({ workspace_id: "workspace-test", role: "admin", active: true });
  if (url.pathname === "/rest/v1/condominiums" && method === "GET") return json({ id: "condo-uuid", workspace_id: "workspace-test", legacy_id: 77, name: "Condominio test" });
  if (url.pathname === "/rest/v1/condominium_members" && method === "GET") return json({ id: "member-uuid", condominium_id: "condo-uuid", user_id: null, name: "Mario Rossi", email: "mario@example.test", role: "resident", active: true, permissions: [], data: { apartment: "12", role: memberRole }, legacy_id: 12, unit_id: "unit-uuid" });
  if (url.pathname === "/rest/v1/profiles" && method === "GET") return json({ role: "resident" });
  if (url.pathname === "/rest/v1/profiles" && method === "POST") return json({}, 201);
  if (url.pathname === "/rest/v1/condominium_members" && method === "PATCH") return new Response(null, { status: 204 });
  if (url.pathname === "/rest/v1/portal_access" && method === "POST") {
    portalPayload = JSON.parse(String(init.body ?? "null"));
    return json({}, 201);
  }
  throw new Error("Unexpected mocked Supabase request: " + method + " " + url.pathname + url.search);
};

(Deno).serve = ((callback) => { handler = callback; return { finished: Promise.resolve() }; });
try {
  await import("../supabase/functions/bethag-invite-resident/index.ts?positive-invite-test");
} finally {
  Deno.serve = originalServe;
}
assert.equal(typeof handler, "function", "Edge Function handler was not captured");

async function runScenario(role, expectedPermissions) {
  memberRole = role;
  portalPayload = undefined;
  invitedEmail = undefined;
  const response = await handler(new Request("https://mock.supabase.test/functions/v1/bethag-invite-resident", {
    method: "POST",
    headers: { Authorization: "Bearer mock-user-jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId: "workspace-test", condominiumId: 77, legacyId: 12 }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200, role + " invite should succeed: " + JSON.stringify(body));
  assert.equal(body.success, true);
  assert.equal(body.invited, true);
  assert.equal(invitedEmail, "mario@example.test");
  assert.deepEqual(portalPayload.permissions, expectedPermissions, role + " portal permissions mismatch");
  assert.equal(portalPayload.role, "resident");
  assert.equal(portalPayload.workspace_id, "workspace-test");
}

try {
  await runScenario("Proprietario", ["documenti", "verbali", "regolamento", "pagamenti_ordinari", "pagamenti_straordinari", "assemblee", "comunicazioni"]);
  console.log("PASS: positive owner invitation and portal permissions");
  await runScenario("Inquilino", ["pagamenti_ordinari", "comunicazioni", "regolamento"]);
  console.log("PASS: positive tenant invitation and restricted portal permissions");
} finally {
  globalThis.fetch = originalFetch;
}
console.log("PASS: invite flow tested with mocked Auth/DB; no real emails or project writes.");
