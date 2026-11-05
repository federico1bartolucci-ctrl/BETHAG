import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
const baseURL = process.env.BETHAG_QA_BASE_URL || "http://127.0.0.1:4173/BETHAG/";
assert.ok(publishableKey && serviceRoleKey, "Missing active-QA credentials.");

const service = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
const marker = "BETHAG_APP08_NEW_OWNER_" + suffix;
const email = "bethag-incoming-" + suffix.toLowerCase() + "@example.com";
const password = "Qa!" + randomUUID().replaceAll("-", "").slice(0, 20) + "9";
const fullName = "Nuovo Proprietario QA " + suffix;
const fiscalCode = "QA" + suffix.padEnd(14, "X").slice(0, 14);
const condominiumName = "Condominio APP08 " + suffix;
const unitCode = "APP08-" + suffix.slice(0, 8);

let workspaceId = null;
let condominiumId = null;
let unitId = null;
let memberId = null;
let userId = null;
let browser = null;
let verifiedByToken = false;
let rpcResult = null;
const pageErrors = [];

function check(result, label) {
  if (result.error) throw new Error(label + ": " + result.error.message);
  return result.data;
}

async function cleanup() {
  const errors = [];
  if (userId) {
    for (const [label, query] of [
      ["portal access", service.from("portal_access").delete().eq("user_id", userId)],
      ["registration requests", service.from("portal_registration_requests").delete().eq("requested_user_id", userId)],
      ["workspace membership", service.from("workspace_members").delete().eq("user_id", userId)],
    ]) {
      const result = await query;
      if (result.error) errors.push(label + ": " + result.error.message);
    }
  }
  if (memberId) {
    const result = await service.from("portal_access").delete().eq("member_id", memberId);
    if (result.error) errors.push("member portal access: " + result.error.message);
    const member = await service.from("condominium_members").delete().eq("id", memberId);
    if (member.error) errors.push("member: " + member.error.message);
  }
  if (unitId) {
    const unit = await service.from("condominium_units").delete().eq("id", unitId);
    if (unit.error) errors.push("unit: " + unit.error.message);
  }
  if (condominiumId) {
    const condo = await service.from("condominiums").delete().eq("id", condominiumId);
    if (condo.error) errors.push("condominium: " + condo.error.message);
  }
  if (userId) {
    const deleted = await service.auth.admin.deleteUser(userId);
    if (deleted.error) errors.push("Auth user: " + deleted.error.message);
  }

  if (email) {
    const [portal, members, requests, condos] = await Promise.all([
      service.from("portal_access").select("id").ilike("email", email),
      service.from("condominium_members").select("id").ilike("email", email),
      service.from("portal_registration_requests").select("id").ilike("email", email),
      service.from("condominiums").select("id").eq("name", condominiumName),
    ]);
    for (const [label, result] of [["portal", portal], ["members", members], ["requests", requests], ["condominiums", condos]]) {
      if (result.error) errors.push("verify cleanup " + label + ": " + result.error.message);
      else if (result.data.length) errors.push("cleanup left " + result.data.length + " " + label + " rows");
    }
  }
  if (errors.length) throw new Error("QA fixture cleanup failed: " + errors.join("; "));
}

try {
  const workspace = check(
    await service.from("workspaces").select("id").eq("name", "BETHAG_QA_FIXTURE_20261102").single(),
    "find retained QA fixture workspace"
  );
  workspaceId = workspace.id;

  const condo = check(
    await service.from("condominiums").insert({
      workspace_id: workspaceId,
      name: condominiumName,
      address: "QA TEST - NON UTILIZZARE",
      data: { bethag_qa_marker: marker },
    }).select("id").single(),
    "create temporary incoming-owner condominium"
  );
  condominiumId = condo.id;

  const unit = check(
    await service.from("condominium_units").insert({
      workspace_id: workspaceId,
      condominium_id: condominiumId,
      unit_code: unitCode,
      building_code: "A",
      data: { apartment: unitCode, bethag_qa_marker: marker },
    }).select("id").single(),
    "create temporary incoming-owner unit"
  );
  unitId = unit.id;

  const member = check(
    await service.from("condominium_members").insert({
      condominium_id: condominiumId,
      unit_id: unitId,
      name: fullName,
      email,
      role: "resident",
      active: true,
      data: {
        role: "Proprietario",
        fiscalCode,
        apartment: unitCode,
        ownership_share: 100,
        current_owner: true,
        position_status: "Attivo",
        bethag_qa_marker: marker,
      },
    }).select("id").single(),
    "create temporary incoming-owner member"
  );
  memberId = member.id;

  // Generate a real Supabase signup verification token without relying on an external
  // mailbox. The token is consumed through the public verifyOtp endpoint below.
  const generated = check(
    await service.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { data: { full_name: fullName, bethag_role: "resident", bethag_qa_marker: marker } },
    }),
    "generate temporary Auth signup verification token"
  );
  userId = generated.user.id;
  const tokenHash = generated.properties?.hashed_token;
  assert.ok(tokenHash, "Supabase did not return a signup verification token.");

  const verification = check(
    await publicClient.auth.verifyOtp({ token_hash: tokenHash, type: "signup" }),
    "verify new incoming-owner email token"
  );
  verifiedByToken = true;
  assert.equal(verification.user.id, userId);
  assert.ok(verification.user.email_confirmed_at, "The new Auth account is not email-confirmed.");

  rpcResult = check(
    await publicClient.rpc("complete_portal_registration", {
      p_full_name: fullName,
      p_fiscal_code: fiscalCode,
      p_condominium_name: condominiumName,
    }),
    "complete portal registration for new incoming owner"
  );
  assert.equal(rpcResult.status, "approved");
  assert.equal(rpcResult.member_id, memberId);
  assert.equal(rpcResult.condominium_id, condominiumId);
  assert.equal(rpcResult.workspace_id, workspaceId);

  const portal = check(
    await service.from("portal_access")
      .select("id,user_id,member_id,workspace_id,condominium_id,email,role,active")
      .eq("user_id", userId).eq("member_id", memberId).single(),
    "verify created portal access"
  );
  assert.equal(portal.email, email);
  assert.equal(portal.role, "resident");
  assert.equal(portal.active, true);
  assert.equal(portal.condominium_id, condominiumId);

  const membership = check(
    await service.from("workspace_members")
      .select("user_id,workspace_id,condominium_id,role,active")
      .eq("user_id", userId).eq("workspace_id", workspaceId).single(),
    "verify created workspace membership"
  );
  assert.equal(membership.role, "resident");
  assert.equal(membership.active, true);
  assert.equal(membership.condominium_id, condominiumId);

  await publicClient.auth.signOut();

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("dialog", async dialog => { await dialog.accept(); });

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Accedi" }).first().click();
  await page.getByRole("heading", { name: "Accedi a BETHAG" }).waitFor();
  await page.getByRole("button", { name: "Condomino", exact: true }).click();
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[autocomplete="current-password"]').first().fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).last().click();

  const portalHeading = page.locator(".resident-hero h1");
  const residentIdentity = page.locator(".resident-identity strong");
  await portalHeading.waitFor({ state: "visible", timeout: 25000 });
  await page.waitForFunction(
    ({ expectedCondominium, expectedMember }) => {
      const heading = document.querySelector(".resident-hero h1")?.textContent?.trim();
      const identity = document.querySelector(".resident-identity strong")?.textContent?.trim();
      return heading === expectedCondominium && identity === expectedMember;
    },
    { expectedCondominium: condominiumName, expectedMember: fullName },
    { timeout: 25000 }
  );
  assert.equal((await portalHeading.textContent())?.trim(), condominiumName);
  assert.equal((await residentIdentity.textContent())?.trim(), fullName);
  assert.deepEqual(pageErrors, [], "Browser uncaught errors: " + pageErrors.join(" | "));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    ({ expectedCondominium, expectedMember }) => {
      const heading = document.querySelector(".resident-hero h1")?.textContent?.trim();
      const identity = document.querySelector(".resident-identity strong")?.textContent?.trim();
      return heading === expectedCondominium && identity === expectedMember;
    },
    { expectedCondominium: condominiumName, expectedMember: fullName },
    { timeout: 25000 }
  );
  assert.deepEqual(pageErrors, [], "Browser uncaught errors after refresh: " + pageErrors.join(" | "));

  await context.close();
  console.log(JSON.stringify({
    suite: "BETHAG_QA_APP08_NEW_INCOMING_OWNER_BROWSER",
    target: "jhuyhlzzydcgghrzeexn",
    status: "PASS",
    email_verification: "PASS — generated Supabase signup token consumed by public verifyOtp endpoint; external mailbox delivery is not covered",
    checks: [
      "new Auth identity created through Supabase signup-link generation",
      "new email verified through the public Auth token-verification endpoint",
      "complete_portal_registration approved the exact active condominium member",
      "portal_access created for the new Auth user and exact member",
      "workspace_members created with resident role and correct condominium",
      "first browser login succeeded with the new owner credentials",
      "resident portal hydrated the exact condominium and member identity",
      "refresh preserved the session and rehydrated the same condominium/member",
      "no uncaught browser errors",
    ],
    cleanup: "temporary Auth user and all temporary condominium/member/unit/portal rows removed in finally",
  }, null, 2));
} finally {
  await browser?.close();
  await cleanup();
}
