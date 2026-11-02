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

async function cleanupFixtures() {
  const condos = await cleanup.from("condominiums").select("id").in("name", [condoName, editedCondoName]);
  if (condos.error) throw condos.error;
  for (const condo of condos.data || []) {
    for (const table of ["condominium_members", "condominium_units"]) {
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
  const created = await cleanup.from("condominiums").select("id").eq("name", condoName).single();
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
  const archived = await cleanup.from("condominiums").select("id,archived_at,archived_by,archive_reason,data").eq("id", created.data.id).single();
  assert.ifError(archived.error);
  assert.ok(archived.data.archived_at, "Condominium archive timestamp was not persisted; row=" + JSON.stringify(archived.data));
  assert.ok(archived.data.archived_by, "Condominium archive actor was not persisted");
  assert.equal(Date.parse(archived.data.data.archivedAt), Date.parse(archived.data.archived_at), "JSON and structured archive timestamps diverged");
  await adminPage.locator(".nav-item").filter({ hasText: "Archivio" }).first().click();
  const archiveCard = adminPage.locator(".card").filter({ hasText: editedCondoName });
  await archiveCard.waitFor({ timeout: 15000 });
  await archiveCard.getByRole("button", { name: "Ripristina" }).click();
  await archiveCard.waitFor({ state: "detached", timeout: 15000 });
  const restored = await cleanup.from("condominiums").select("archived_at,archived_by,archive_reason,data").eq("id", created.data.id).single();
  assert.ifError(restored.error);
  assert.equal(restored.data.archived_at, null);
  assert.equal(restored.data.archived_by, null);
  assert.equal(restored.data.archive_reason, null);
  assert.equal(restored.data.data.archivedAt, undefined);
  await adminPage.reload({ waitUntil: "networkidle" });
  await adminPage.locator(".nav-item").filter({ hasText: "Condomini" }).first().waitFor({ timeout: 15000 });
  await adminPage.locator(".nav-item").filter({ hasText: "Condomini" }).first().click();
  await adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).waitFor({ timeout: 20000 });
  // The synthetic condominium is removed by cleanupFixtures() in finally.
  // APP-05 covers create/edit/archive/restore; destructive deletion is not
  // coupled to this acceptance flow.
  results.push({ id: "APP-05", status: "PASS", checks: ["condominium created from UI", "physical structure saved as 2 interiors + 3 autonomous appurtenances", "condominium edited from UI", "archive metadata persisted in structured columns", "condominium restored from UI and archive metadata cleared"] });

  await adminPage.locator(".nav-item").filter({ hasText: "Comunicazioni" }).first().click();
  await adminPage.getByRole("button", { name: "+ Nuova comunicazione" }).click();
  await adminPage.getByRole("heading", { name: "Nuova comunicazione al Portale" }).waitFor();
  await field(adminPage, "Titolo *").fill(communicationTitle);
  await adminPage.locator(".modal .field").filter({ hasText: "Condominio" }).locator("select").first().selectOption({ label: "Condominio QA BETHAG" });
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
