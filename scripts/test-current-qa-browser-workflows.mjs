import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
const baseURL = process.env.BETHAG_QA_BASE_URL || "http://127.0.0.1:4173/BETHAG/";
const adminPassword = process.env.BETHAG_QA_ADMIN_PASSWORD;
const residentPassword = process.env.BETHAG_QA_RESIDENT_PASSWORD;
assert.ok(key && serviceKey && adminPassword && residentPassword, "Missing QA credentials");

const cleanup = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const marker = "BETHAG_UI_ACCEPTANCE_" + Date.now();
const condoName = marker + "_CONDO";
const editedCondoName = marker + "_EDITED";
const communicationTitle = marker + "_COMM";
const browser = await chromium.launch({ headless: true });
const results = [];
const pageErrors = [];

async function signIn(page, role, email, password, landing) {
  page.on("pageerror", e => pageErrors.push(role + ": " + e.message));
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Accedi" }).first().click();
  await page.getByRole("heading", { name: "Accedi a BETHAG" }).waitFor();
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[autocomplete="current-password"]').first().fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).last().click();
  await page.getByText(landing, { exact: true }).first().waitFor({ timeout: 25000 });
}

function field(page, label) {
  return page.locator(".modal .field > label").filter({ hasText: label }).first().locator("xpath=..").locator("input, textarea").first();
}

async function waitForDbRow(loadRow, predicate, description, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await loadRow();
    if (last.error) throw last.error;
    if (predicate(last.data)) return last.data;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(description + " timed out; last row=" + JSON.stringify(last?.data ?? null));
}

async function cleanupFixtures() {
  const condos = await cleanup.from("condominiums").select("id").in("name", [condoName, editedCondoName]);
  if (condos.error) throw condos.error;
  for (const condo of condos.data || []) {
    for (const table of ["portal_access", "condominium_members", "condominium_units"]) {
      const result = await cleanup.from(table).delete().eq("condominium_id", condo.id);
      if (result.error) throw result.error;
    }
    const del = await cleanup.from("condominiums").delete().eq("id", condo.id);
    if (del.error) throw del.error;
  }
  const comms = await cleanup.from("communications").select("id").eq("title", communicationTitle);
  if (comms.error) throw comms.error;
  for (const comm of comms.data || []) {
    const recipients = await cleanup.from("communication_recipients").delete().eq("communication_id", comm.id);
    if (recipients.error) throw recipients.error;
    const del = await cleanup.from("communications").delete().eq("id", comm.id);
    if (del.error) throw del.error;
  }

  const remainingCondos = await cleanup.from("condominiums").select("id").in("name", [condoName, editedCondoName]);
  if (remainingCondos.error) throw remainingCondos.error;
  if ((remainingCondos.data || []).length) throw new Error("QA cleanup left synthetic condominium fixtures behind.");

  const remainingComms = await cleanup.from("communications").select("id").eq("title", communicationTitle);
  if (remainingComms.error) throw remainingComms.error;
  if ((remainingComms.data || []).length) throw new Error("QA cleanup left synthetic communication fixtures behind.");
}

try {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const dialogs = [];
  adminPage.on("dialog", async d => { dialogs.push({ type: d.type(), message: d.message() }); await d.accept(); });
  await signIn(adminPage, "Amministratore", "bethag-admin-qa@example.com", adminPassword, "Homepage");

  await adminPage.locator(".nav-item").filter({ hasText: "Condomini" }).first().click();
  await adminPage.getByRole("heading", { name: "Condomìni", exact: true }).waitFor({ state: "visible", timeout: 20000 });
  await adminPage.getByRole("button", { name: "+ Nuovo condominio" }).waitFor({ state: "visible", timeout: 20000 });
  await adminPage.getByRole("button", { name: "+ Nuovo condominio" }).click();
  await adminPage.getByRole("heading", { name: "Nuovo condominio" }).waitFor();
  await field(adminPage, "Nome del condominio *").fill(condoName);
  await field(adminPage, "Indirizzo *").fill("Via QA UI 1");
  await field(adminPage, "Comune").fill("Imola");
  await field(adminPage, "Provincia").fill("BO");
  await field(adminPage, "Numero civici").fill("1");
  await field(adminPage, "Numero interni").fill("2");
  await field(adminPage, "Autorimesse / box").fill("1");
  await field(adminPage, "Cantine").fill("1");
  await field(adminPage, "Posti auto").fill("1");
  assert.equal(await field(adminPage, "Nome del condominio *").inputValue(), condoName, "Condominium name field was not filled");
  assert.equal(await field(adminPage, "Indirizzo *").inputValue(), "Via QA UI 1", "Condominium address field was not filled");
  assert.equal(await field(adminPage, "Numero interni").inputValue(), "2", "Interior count field was not filled");
  await adminPage.getByRole("button", { name: "Salva condominio" }).click();
  await adminPage.locator("h1").filter({ hasText: condoName }).first().waitFor({ timeout: 20000 });
  const created = await cleanup.from("condominiums").select("id,workspace_id").eq("name", condoName).single();
  assert.ifError(created.error);
  const units = await cleanup.from("condominium_units").select("id", { count: "exact", head: true }).eq("condominium_id", created.data.id);
  assert.ifError(units.error);
  assert.equal(units.count, 5, "UI structure should persist 2 interiors + 3 autonomous appurtenances");

  await adminPage.locator(".detail-page-actions").getByRole("button", { name: "Modifica" }).click();
  await adminPage.getByRole("heading", { name: "Modifica condominio" }).waitFor();
  await field(adminPage, "Nome del condominio *").fill(editedCondoName);
  await adminPage.getByRole("button", { name: "Salva modifiche" }).click();
  await adminPage.locator("h1").filter({ hasText: editedCondoName }).first().waitFor({ timeout: 20000 });
  const edited = await cleanup.from("condominiums").select("id,name").eq("id", created.data.id).single();
  assert.ifError(edited.error);
  assert.equal(edited.data.name, editedCondoName);

  await adminPage.locator(".detail-page-actions").getByRole("button", { name: "Archivia" }).click();
  await adminPage.locator(".nav-item").filter({ hasText: "Archivio" }).first().click();
  const archiveCard = adminPage.locator(".card").filter({ hasText: editedCondoName });
  await archiveCard.waitFor({ timeout: 15000 });
  const archived = await waitForDbRow(
    () => cleanup.from("condominiums").select("id,archived_at,archived_by,archive_reason,data").eq("id", created.data.id).single(),
    row => Boolean(row?.archived_at && row?.archived_by),
    "Condominium archive persistence"
  );
  assert.ok(archived.archived_at, "Condominium archive timestamp was not persisted");
  assert.ok(archived.archived_by, "Condominium archive actor was not persisted");
  const archivedJsonAt = archived.data.archivedAt;
  const archivedJsonMs = typeof archivedJsonAt === "number" ? archivedJsonAt : Date.parse(archivedJsonAt);
  const columnArchivedMs = Date.parse(archived.archived_at);
  assert.ok(Number.isFinite(archivedJsonMs), "JSON archive timestamp is invalid: " + JSON.stringify(archivedJsonAt));
  assert.ok(Number.isFinite(columnArchivedMs), "Structured archive timestamp is invalid: " + JSON.stringify(archived.archived_at));
  assert.ok(Math.abs(archivedJsonMs - columnArchivedMs) <= 5000, "JSON and structured archive timestamps differ by more than five seconds: " + JSON.stringify({ json: archivedJsonAt, column: archived.archived_at }));
  await archiveCard.getByRole("button", { name: "Ripristina" }).click();
  await archiveCard.waitFor({ state: "detached", timeout: 15000 });
  const restored = await waitForDbRow(
    () => cleanup.from("condominiums").select("archived_at,archived_by,archive_reason,data").eq("id", created.data.id).single(),
    row => row?.archived_at === null && row?.archived_by === null && row?.archive_reason === null,
    "Condominium restore persistence"
  );
  assert.equal(restored.data.archivedAt, undefined);
  await adminPage.reload({ waitUntil: "networkidle" });
  await adminPage.locator(".nav-item").filter({ hasText: "Condomini" }).first().waitFor({ timeout: 15000 });
  await adminPage.locator(".nav-item").filter({ hasText: "Condomini" }).first().click();
  await adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).waitFor({ timeout: 20000 });
  // The synthetic condominium is removed by cleanupFixtures() in finally.
  // APP-05 covers create/edit/archive/restore; destructive deletion is not
  // coupled to this acceptance flow.
  results.push({ id: "APP-05", status: "PASS", checks: ["condominium created from UI", "physical structure saved as 2 interiors + 3 autonomous appurtenances", "condominium edited from UI", "archive metadata persisted in structured columns", "condominium restored from UI and archive metadata cleared"] });

  const users = await cleanup.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(users.error);
  const residentUser = users.data.users.find(user => user.email?.toLowerCase() === "bethag-condomino-qa@example.com");
  assert.ok(residentUser?.id, "QA resident account was not found for the portal fixture");
  const residentUnit = await cleanup.from("condominium_units")
    .select("id,unit_code")
    .eq("condominium_id", created.data.id)
    .limit(1)
    .single();
  assert.ifError(residentUnit.error);
  const member = await cleanup.from("condominium_members").insert({
    condominium_id: created.data.id,
    user_id: residentUser.id,
    name: "BETHAG QA UI Resident",
    email: residentUser.email,
    role: "resident",
    active: true,
    permissions: {},
    data: { source: "BETHAG_QA_UI" },
    unit_id: residentUnit.data.id,
  }).select("id").single();
  assert.ifError(member.error);
  const portalAccess = await cleanup.from("portal_access").insert({
    workspace_id: created.data.workspace_id,
    condominium_id: created.data.id,
    name: "BETHAG QA UI Resident",
    email: residentUser.email,
    role: "resident",
    apartment: residentUnit.data.unit_code,
    permissions: ["comunicazioni"],
    active: true,
    user_id: residentUser.id,
    member_id: member.data.id,
    data: { source: "BETHAG_QA_UI" },
  }).select("id").single();
  assert.ifError(portalAccess.error);

  await adminPage.locator(".nav-item").filter({ hasText: "Comunicazioni" }).first().click();
  await adminPage.getByRole("button", { name: "+ Nuova comunicazione" }).click();
  await adminPage.getByRole("heading", { name: "Nuova comunicazione al Portale" }).waitFor();
  await field(adminPage, "Titolo *").fill(communicationTitle);
  await adminPage.locator(".modal .field").filter({ hasText: "Condominio" }).locator("select").first().selectOption({ label: editedCondoName });
  await field(adminPage, "Contenuto *").fill("Messaggio sintetico di verifica UI BETHAG.");
  const portalCheckbox = adminPage.locator(".modal .checkbox-field input[type='checkbox']").first();
  if (!(await portalCheckbox.isChecked())) await portalCheckbox.check();
  await adminPage.getByRole("button", { name: "Salva", exact: true }).click();
  const commCard = adminPage.locator(".communication-card").filter({ hasText: communicationTitle });
  await commCard.waitFor({ timeout: 20000 });

  const residentContext = await browser.newContext();
  const residentPage = await residentContext.newPage();
  await signIn(residentPage, "Condomino", "bethag-condomino-qa@example.com", residentPassword, "Portale condòmino");
  await residentPage.getByText(communicationTitle, { exact: true }).waitFor({ timeout: 15000 });

  await commCard.getByRole("button", { name: "Ritira" }).click();
  await residentPage.reload({ waitUntil: "networkidle" });
  await residentPage.getByText(communicationTitle, { exact: true }).waitFor({ state: "detached", timeout: 15000 });
  await commCard.locator(".mini-danger").click();
  await commCard.waitFor({ state: "detached", timeout: 20000 });
  results.push({ id: "APP-12", status: "PASS", checks: ["administrator created and published communication from UI", "resident saw published communication", "administrator withdrew publication", "resident lost visibility after withdrawal", "communication deleted from UI"] });

  await residentContext.close();
  await adminContext.close();
  assert.deepEqual(pageErrors, []);
} finally {
  await cleanupFixtures();
  await browser.close();
}
console.log(JSON.stringify({ suite: "BETHAG_QA_BROWSER_WORKFLOWS", target: "jhuyhlzzydcgghrzeexn", results, pageErrors, cleanup: "service-role cleanup verified" }, null, 2));
if (results.length !== 2 || results.some(x => x.status !== "PASS")) process.exitCode = 1;

// Re-run marker: strict-mode heading selector uses the unique h1 after save.

// Retry after QA-only EXECUTE grant for the guarded private condominium deletion RPC.
