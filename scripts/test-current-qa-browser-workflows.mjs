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
}

try {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  adminPage.on("dialog", d => d.accept());
  await signIn(adminPage, "Amministratore", "bethag-admin-qa@example.com", adminPassword, "Homepage");

  await adminPage.locator(".nav-item").filter({ hasText: "Condomini" }).first().click();
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
  await adminPage.getByRole("button", { name: "Salva condominio" }).click();
  const condoCard = adminPage.locator(".entity-card").filter({ hasText: condoName });
  await condoCard.waitFor({ timeout: 20000 });

  const created = await cleanup.from("condominiums").select("id").eq("name", condoName).single();
  assert.ifError(created.error);
  const units = await cleanup.from("condominium_units").select("id", { count: "exact", head: true }).eq("condominium_id", created.data.id);
  assert.ifError(units.error);
  assert.equal(units.count, 5, "UI structure should persist 2 interiors + 3 autonomous appurtenances");

  await condoCard.getByRole("button", { name: "Modifica" }).click();
  await adminPage.getByRole("heading", { name: "Modifica condominio" }).waitFor();
  await field(adminPage, "Nome del condominio *").fill(editedCondoName);
  await adminPage.getByRole("button", { name: "Salva modifiche" }).click();
  await adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).waitFor({ timeout: 20000 });
  const edited = await cleanup.from("condominiums").select("id,name").eq("id", created.data.id).single();
  assert.ifError(edited.error);
  assert.equal(edited.data.name, editedCondoName);

  const editedCard = adminPage.locator(".entity-card").filter({ hasText: editedCondoName });
  await editedCard.getByRole("button", { name: "Dettagli" }).click();
  await adminPage.getByRole("button", { name: "Elimina", exact: true }).click();
  await adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).waitFor({ state: "detached", timeout: 20000 });
  const afterDelete = await cleanup.from("condominiums").select("id").eq("id", created.data.id);
  assert.ifError(afterDelete.error);
  assert.equal(afterDelete.data.length, 0);
  results.push({ id: "APP-05", status: "PASS", checks: ["condominium created from UI", "physical structure saved as 2 interiors + 3 autonomous appurtenances", "condominium edited from UI", "condominium deleted from UI"] });

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
