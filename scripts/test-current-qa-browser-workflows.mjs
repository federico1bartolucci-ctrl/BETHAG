import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = "https://jhuyhlzzydcgghrzeexn.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.BETHAG_QA_SERVICE_ROLE_KEY;
const baseURL = process.env.BETHAG_QA_BASE_URL || "http://127.0.0.1:4173/BETHAG/";
const adminPassword = process.env.BETHAG_QA_ADMIN_PASSWORD;
const residentPassword = process.env.BETHAG_QA_RESIDENT_PASSWORD;
assert.ok(key && serviceKey && adminPassword && residentPassword, "Missing QA credentials");

const cleanup = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const adminEmail = "bethag-admin-qa@example.com";
const adminApi = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const marker = "BETHAG_UI_ACCEPTANCE_" + Date.now();
const condoName = marker + "_CONDO";
const editedCondoName = marker + "_EDITED";
const communicationTitle = marker + "_COMM";
const browser = await chromium.launch({ headless: true });
const results = [];
const pageErrors = [];
const consoleErrors = [];
const consoleMessages = [];
const failedRequests = [];
const consoleErrorEvents = [];
let browserTeardownStarted = false;
let temporaryResidentId = null;
let temporaryResidentEmail = null;
let temporaryResidentPassword = null;
let accountingFiscalYearId = null;
let accountingLedgerId = null;
let accountingAllocationId = null;
let accountingInstallmentId = null;
let accountingTransferId = null;
let accountingOutgoingMemberId = null;
let accountingIncomingMemberId = null;

async function signIn(page, role, email, password, landing) {
  page.on("pageerror", e => pageErrors.push(role + ": " + e.message));
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
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

async function clickWithRetry(locator, afterLocator, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await locator.waitFor({ state: "visible", timeout: 10000 });
      await locator.click({ timeout: 5000 });
      return;
    } catch (error) {
      lastError = error;
      if (afterLocator && await afterLocator.count()) return;
      if (!/detached from the DOM|not stable|Timeout/i.test(String(error))) throw error;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

async function clickUntilVisible(page, locator, target, description, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await target.isVisible().catch(() => false)) return;
    try {
      await locator.click({ timeout: 5000 });
    } catch (error) {
      lastError = error;
    }
    try {
      await target.waitFor({ state: "visible", timeout: 5000 });
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
  throw new Error(description + " did not render; url=" + page.url() + "; body=" + (await page.locator("body").innerText()).slice(0, 3000) + "; last=" + String(lastError));
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
  const { error: authError } = await adminApi.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (authError) throw authError;

  const comms = await cleanup.from("communications").select("id").like("title", marker + "%");
  if (comms.error) throw comms.error;
  for (const comm of comms.data || []) {
    const recipients = await cleanup.from("communication_recipients").delete().eq("communication_id", comm.id);
    if (recipients.error) throw recipients.error;
    const del = await cleanup.from("communications").delete().eq("id", comm.id);
    if (del.error) throw del.error;
  }

  // Direct DELETE is intentionally avoided: the application protects
  // condominium deletion behind its authenticated, audited RPC.
  if (accountingTransferId) {
    const transfer = await cleanup.from("condominium_member_transfers").delete().eq("id", accountingTransferId);
    if (transfer.error) throw transfer.error;
  }
  if (accountingIncomingMemberId) {
    const incomingMember = await cleanup.from("condominium_members").delete().eq("id", accountingIncomingMemberId);
    if (incomingMember.error) throw incomingMember.error;
  }
  if (accountingOutgoingMemberId) {
    const outgoingMember = await cleanup.from("condominium_members").delete().eq("id", accountingOutgoingMemberId);
    if (outgoingMember.error) throw outgoingMember.error;
  }
  if (accountingInstallmentId) {
    const movements = await cleanup.from("condominium_payment_movements").delete().eq("installment_id", accountingInstallmentId);
    if (movements.error) throw movements.error;
    const installment = await cleanup.from("condominium_installments").delete().eq("id", accountingInstallmentId);
    if (installment.error) throw installment.error;
  }
  if (accountingAllocationId) {
    const allocation = await cleanup.from("condominium_expense_allocations").delete().eq("id", accountingAllocationId);
    if (allocation.error) throw allocation.error;
  }
  if (accountingLedgerId) {
    const ledger = await cleanup.from("condominium_ledger_entries").delete().eq("id", accountingLedgerId);
    if (ledger.error) throw ledger.error;
  }
  if (accountingFiscalYearId) {
    const fiscalYear = await cleanup.from("condominium_fiscal_years").delete().eq("id", accountingFiscalYearId);
    if (fiscalYear.error) throw fiscalYear.error;
  }

  const condos = await cleanup.from("condominiums")
    .select("id,workspace_id,legacy_id")
    .like("name", marker + "%");
  if (condos.error) throw condos.error;
  for (const condo of condos.data || []) {
    const { error } = await adminApi.rpc("delete_condominium", {
      p_workspace_id: condo.workspace_id,
      p_legacy_id: condo.legacy_id,
      p_security_code: null,
    });
    if (error) throw error;
  }

  const remainingCondos = await cleanup.from("condominiums").select("id").like("name", marker + "%");
  if (remainingCondos.error) throw remainingCondos.error;
  if ((remainingCondos.data || []).length) throw new Error("QA cleanup left synthetic condominium fixtures behind.");

  const remainingComms = await cleanup.from("communications").select("id").like("title", marker + "%");
  if (remainingComms.error) throw remainingComms.error;
  if ((remainingComms.data || []).length) throw new Error("QA cleanup left synthetic communication fixtures behind.");

  const remainingPortal = await cleanup.from("portal_access").select("id").eq("data->>source", marker);
  if (remainingPortal.error) throw remainingPortal.error;
  if ((remainingPortal.data || []).length) throw new Error("QA cleanup left synthetic portal access fixtures behind.");

  const remainingMembers = await cleanup.from("condominium_members").select("id").eq("data->>source", marker);
  if (remainingMembers.error) throw remainingMembers.error;
  if ((remainingMembers.data || []).length) throw new Error("QA cleanup left synthetic condominium member fixtures behind.");

  if (temporaryResidentId) {
    const workspaceMemberships = await cleanup.from("workspace_members").delete().eq("user_id", temporaryResidentId);
    if (workspaceMemberships.error) throw workspaceMemberships.error;
    const deletedUser = await cleanup.auth.admin.deleteUser(temporaryResidentId);
    if (deletedUser.error) throw deletedUser.error;
    temporaryResidentId = null;
  }
}

try {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  adminPage.on("console", message => {
    consoleMessages.push({ type: message.type(), text: message.text() });
    if (message.type() === "error") {
      consoleErrors.push(message.text());
      consoleErrorEvents.push({ text: message.text(), duringTeardown: browserTeardownStarted });
    }
  });
  adminPage.on("requestfailed", request => failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText ?? "unknown",
    duringTeardown: browserTeardownStarted,
  }));
  adminPage.on("response", response => { if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() }); });
  const dialogs = [];
  adminPage.on("dialog", async d => { dialogs.push({ type: d.type(), message: d.message() }); await d.accept(); });
  await signIn(adminPage, "Amministratore", "bethag-admin-qa@example.com", adminPassword, "Homepage");

  const condominiumsNav = adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first();
  const condominiumsHeading = adminPage.getByRole("heading", { name: "Condomìni", exact: true });
  await clickUntilVisible(adminPage, condominiumsNav, condominiumsHeading, "Condomini page");
  const createCondominiumButton = adminPage.getByRole("button", { name: "+ Nuovo condominio" });
  try {
    await createCondominiumButton.waitFor({ state: "visible", timeout: 20000 });
  } catch (error) {
    const diagnostics = await adminPage.evaluate(() => ({
      sessionRole: localStorage.getItem("bethag-session-v1"),
      sessionEmail: localStorage.getItem("bethag-session-email-v1"),
      profile: localStorage.getItem("bethag-profile-v5"),
      page: localStorage.getItem("bethag-current-page-v1"),
      pageText: document.body.innerText.slice(0, 5000),
      pageHeaderButtons: [...document.querySelectorAll(".page-header button")].map(button => button.innerText),
    }));
    console.error("BETHAG_ADMIN_CONDOMINIUM_CREATE_DIAGNOSTIC", JSON.stringify({
      diagnostics,
      pageErrors,
      consoleErrors,
      failedRequests: failedRequests.slice(-30),
    }));
    throw error;
  }
  await clickWithRetry(
    adminPage.getByRole("button", { name: "+ Nuovo condominio" }),
    adminPage.getByRole("heading", { name: "Nuovo condominio" })
  );
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
  const created = await waitForDbRow(
    () => cleanup.from("condominiums").select("id,workspace_id,legacy_id").eq("name", condoName).maybeSingle(),
    row => Boolean(row?.id),
    "Condominium creation persistence"
  );
  // Exercise the administrator-only insurance section, whose load/save/delete
  // paths all call getActiveWorkspaceId() without an explicit user ID.
  const insuranceSection = adminPage.locator(".condominium-section-card").filter({
    has: adminPage.getByRole("heading", { name: "Polizze assicurative", exact: true }),
  });
  await insuranceSection.getByRole("heading", { name: "Polizze assicurative", exact: true }).waitFor({ timeout: 15000 });
  await insuranceSection.getByRole("button", { name: "+ Nuova polizza" }).waitFor({ state: "visible" });
  await adminPage.waitForTimeout(500);
  assert.ok(
    !consoleErrors.some(message => message.includes("BETHAG insurance load error")),
    "Insurance policy list failed while resolving the active administrator workspace: " + JSON.stringify(consoleErrors)
  );
  const policyCompany = marker + "_ASSICURAZIONE";
  const policyNumber = marker + "_POLICY";
  await insuranceSection.getByRole("button", { name: "+ Nuova polizza" }).click();
  await insuranceSection.locator("label").filter({ hasText: "Compagnia assicurativa" }).locator("input").fill(policyCompany);
  await insuranceSection.locator("label").filter({ hasText: "Numero polizza" }).locator("input").fill(policyNumber);
  await insuranceSection.getByRole("button", { name: "Salva polizza" }).click();
  const policyCard = insuranceSection.locator(".request-card").filter({ hasText: policyNumber });
  try {
    await policyCard.waitFor({ timeout: 15000 });
  } catch (policyUiError) {
    const policyDebug = await cleanup.from("condominium_insurance_policies")
      .select("id,workspace_id,condominium_id,company_name,policy_number,active")
      .eq("workspace_id", created.workspace_id)
      .eq("condominium_id", created.id)
      .eq("policy_number", policyNumber)
      .maybeSingle();
    throw new Error("Insurance policy did not appear after save: " + JSON.stringify({
      cause: policyUiError.message,
      policyRow: policyDebug.data,
      policyError: policyDebug.error?.message,
      sectionText: (await insuranceSection.innerText().catch(() => "")).slice(0, 2500),
      consoleErrors,
      failedRequests,
      dialogs,
    }));
  }
  const storedPolicy = await waitForDbRow(
    () => cleanup.from("condominium_insurance_policies").select("id,company_name,policy_number,condominium_id")
      .eq("workspace_id", created.workspace_id).eq("condominium_id", created.id).eq("policy_number", policyNumber).maybeSingle(),
    row => Boolean(row?.id),
    "Administrator insurance policy persistence"
  );
  assert.equal(storedPolicy.company_name, policyCompany);
  await policyCard.getByRole("button", { name: "×" }).click();
  await policyCard.waitFor({ state: "detached", timeout: 15000 });
  const deletedPolicy = await cleanup.from("condominium_insurance_policies").select("id")
    .eq("id", storedPolicy.id).maybeSingle();
  assert.ifError(deletedPolicy.error);
  assert.equal(deletedPolicy.data, null, "Administrator insurance policy delete did not persist");
  assert.ok(!pageErrors.length, "Unexpected browser exceptions during insurance policy CRUD: " + JSON.stringify(pageErrors));
  assert.ok(
    !failedRequests.some(request => request.url?.includes("/rest/v1/workspace_members") && request.status >= 400),
    "Workspace membership lookup failed during administrator insurance policy CRUD: " + JSON.stringify(failedRequests)
  );

  const units = await waitForDbRow(
    () => cleanup.from("condominium_units").select("id").eq("condominium_id", created.id),
    rows => Array.isArray(rows) && rows.length === 5,
    "Condominium structure persistence"
  );
  assert.equal(units.length, 5, "UI structure should persist 2 interiors + 3 autonomous appurtenances");

  await adminPage.locator(".detail-page-actions").getByRole("button", { name: "Modifica" }).click();
  await adminPage.getByRole("heading", { name: "Modifica condominio" }).waitFor();
  const editNameInput = field(adminPage, "Nome del condominio *");
  await editNameInput.fill(editedCondoName);
  assert.equal(await editNameInput.inputValue(), editedCondoName, "Edited condominium name was not present in the form");
  const editSubmitButton = adminPage.getByRole("button", { name: "Salva modifiche" });
  const editSubmitDebug = await editSubmitButton.evaluate((button) => ({
    type: button.getAttribute("type"),
    disabled: button.disabled,
    closestForm: Boolean(button.closest("form")),
    formMethod: button.closest("form")?.getAttribute("method") ?? null,
    formAction: button.closest("form")?.getAttribute("action") ?? null,
  }));
  const formValidation = await editSubmitButton.evaluate((button) => {
    const form = button.closest("form");
    const invalid = form ? Array.from(form.elements).filter((element) => !element.checkValidity()).map((element) => ({
      tag: element.tagName, type: element.getAttribute("type"), name: element.getAttribute("name"),
      value: element.value, validationMessage: element.validationMessage,
    })) : [];
    form?.addEventListener("submit", () => {
      window.__qaEditSubmitObserved = true;
      console.log("APP05_NATIVE_SUBMIT_EVENT");
    }, { once: true });
    return { valid: form?.checkValidity() ?? false, invalid };
  });
  console.log("APP05_FORM_VALIDATION_DEBUG", JSON.stringify(formValidation));
  assert.equal(formValidation.valid, true, "Edit form must pass native browser validation before submission");
  await editSubmitButton.click();
  await adminPage.waitForTimeout(300);
  const submitEventObserved = await adminPage.evaluate(() => window.__qaEditSubmitObserved === true);
  console.log("APP05_SUBMIT_EVENT_OBSERVED", submitEventObserved);
  try {
    await adminPage.locator("h1").filter({ hasText: editedCondoName }).first().waitFor({ timeout: 20000 });
  } catch (editUiError) {
    const editedDbState = await cleanup.from("condominiums")
      .select("id,name,archived_at,archived_by,archive_reason,data")
      .eq("id", created.id).maybeSingle();
    console.log("APP05_EDIT_UI_DEBUG", JSON.stringify({
      url: adminPage.url(),
      pageText: (await adminPage.locator("body").innerText()).slice(0, 5000),
      formValidation,
      submitEventObserved,
      consoleMessages,
      editedDbState: editedDbState.data,
      editedDbError: editedDbState.error?.message,
      dialogs,
      consoleErrors,
      failedRequests,
      pageErrors,
    }));
    throw editUiError;
  }
  const edited = await waitForDbRow(
    () => cleanup.from("condominiums").select("id,name").eq("id", created.id).maybeSingle(),
    row => row?.name === editedCondoName,
    "Condominium edit persistence"
  );
  assert.equal(edited.name, editedCondoName);

  await adminPage.locator(".detail-page-actions").getByRole("button", { name: "Archivia" }).click();
  // Do not navigate away while the archive RPC is still running. The click
  // dispatches an async handler; wait for the committed server state first.
  const archived = await waitForDbRow(
    () => cleanup.from("condominiums").select("id,archived_at,archived_by,archive_reason").eq("id", created.id).single(),
    row => Boolean(row?.archived_at && row?.archived_by),
    "Condominium archive persistence"
  );
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Archivio" }).first().click();
  await adminPage.getByRole("heading", { name: "Archivio", exact: true }).waitFor({ timeout: 10000 });
  // Target the actual archive article, not any generic .card wrapper that
  // may contain the same text during React navigation.
  const archiveCard = adminPage.locator("article.card").filter({ hasText: editedCondoName }).first();
  try {
    await archiveCard.waitFor({ timeout: 15000 });
  } catch (archiveUiError) {
    const archiveDbState = await cleanup.from("condominiums")
      .select("id,name,archived_at,archived_by,archive_reason,data")
      .eq("id", created.id).maybeSingle();
    console.log("APP05_ARCHIVE_UI_DEBUG", JSON.stringify({
      url: adminPage.url(),
      pageText: (await adminPage.locator("body").innerText()).slice(0, 5000),
      cardCount: await adminPage.locator(".card").count(),
      cards: await adminPage.locator(".card").allInnerTexts(),
      archiveDbState: archiveDbState.data,
      archiveDbError: archiveDbState.error?.message,
      dialogs,
      consoleErrors,
      failedRequests,
    }));
    throw archiveUiError;
  }
  assert.ok(archived.archived_at, "Condominium archive timestamp was not persisted");
  assert.ok(archived.archived_by, "Condominium archive actor was not persisted");

  // The React state change schedules a background sync after 500ms. Verify
  // that this ordinary save path cannot clear the server-owned archive fields.
  await adminPage.waitForTimeout(1800);
  const archiveAfterBackgroundSync = await cleanup.from("condominiums")
    .select("archived_at,archived_by,archive_reason")
    .eq("id", created.id).single();
  assert.ifError(archiveAfterBackgroundSync.error);
  assert.ok(archiveAfterBackgroundSync.data?.archived_at, "Background sync cleared archived_at");
  assert.ok(archiveAfterBackgroundSync.data?.archived_by, "Background sync cleared archived_by");

  const archiveCardDebug = {
    count: await archiveCard.count(),
    text: await archiveCard.innerText().catch(() => ""),
    buttons: await archiveCard.locator("button").allInnerTexts().catch(() => []),
    restoreButtonCount: await archiveCard.getByRole("button", { name: "Ripristina", exact: true }).count(),
    pageTitle: await adminPage.title(),
    url: adminPage.url(),
    archiveHeadingCount: await adminPage.getByRole("heading", { name: "Archivio", exact: true }).count()
  };
  console.log("APP05_ARCHIVE_CARD_ACTION_DEBUG", JSON.stringify(archiveCardDebug));
  await archiveCard.getByRole("button", { name: "Ripristina", exact: true }).click({ timeout: 10000 });
  await archiveCard.waitFor({ state: "detached", timeout: 15000 });
  const restored = await waitForDbRow(
    () => cleanup.from("condominiums").select("archived_at,archived_by,archive_reason").eq("id", created.id).single(),
    row => row?.archived_at === null && row?.archived_by === null && row?.archive_reason === null,
    "Condominium restore persistence"
  );
  // Wait for the post-reload Supabase hydration response that actually contains
  // this restored record. DOMContentLoaded alone is too early: the React app
  // hydrates its backend state asynchronously after restoring the Auth session.
  const restoredCondominiumHydration = adminPage.waitForResponse(async (response) => {
    const requestUrl = new URL(response.url());
    if (!requestUrl.pathname.endsWith("/rest/v1/condominiums") || requestUrl.searchParams.get("select") !== "*") return false;
    if (!response.ok()) return false;
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) && rows.some((row) =>
      row.id === created.id && row.name === editedCondoName && row.archived_at === null
    );
  }, { timeout: 60000 });
  await adminPage.reload({ waitUntil: "domcontentloaded" });
  await restoredCondominiumHydration;
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first().waitFor({ timeout: 15000 });
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first().click();
  assert.ok(
    !consoleErrors.some((message) => message.includes("Could not find the 'data' column of 'workspace_members'")),
    "Collaborator background sync must not reference a missing workspace_members.data column"
  );
  try {
    await adminPage.getByRole("heading", { name: "Condomìni", exact: true }).waitFor({ timeout: 10000 });
    await adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).waitFor({ timeout: 20000 });
  } catch (restoreUiError) {
    const restoredDbState = await cleanup.from("condominiums")
      .select("id,name,archived_at,archived_by,archive_reason,data")
      .eq("id", created.id).maybeSingle();
    console.log("APP05_RESTORE_UI_DEBUG", JSON.stringify({
      url: adminPage.url(),
      pageText: (await adminPage.locator("body").innerText()).slice(0, 5000),
      entityCards: await adminPage.locator(".entity-card").count(),
      entityCardTexts: await adminPage.locator(".entity-card").allInnerTexts(),
      restoredDbState: restoredDbState.data,
      restoredDbError: restoredDbState.error?.message,
      consoleErrors,
      failedRequests,
      pageErrors,
    }));
    throw restoreUiError;
  }
  // The synthetic condominium is removed by cleanupFixtures() in finally.
  // APP-05 covers create/edit/archive/restore; destructive deletion is not
  // coupled to this acceptance flow.
  results.push({ id: "APP-05", status: "PASS", checks: ["condominium created from UI", "physical structure saved as 2 interiors + 3 autonomous appurtenances", "condominium edited from UI", "archive metadata persisted in structured columns", "condominium restored from UI and archive metadata cleared"] });

  // APP-06 UI acceptance: seed only the fiscal-year container, then create the
  // expense, allocation and installment through the actual administrator UI.
  const accountingUnit = await cleanup.from("condominium_units").select("id,unit_code").eq("condominium_id", created.id).order("created_at", { ascending: true }).limit(1).single();
  assert.ifError(accountingUnit.error);
  const accountingYear = await cleanup.from("condominium_fiscal_years").insert({
    workspace_id: created.workspace_id, condominium_id: created.id,
    name: marker + "_ESERCIZIO", start_date: "2026-01-01", end_date: "2026-12-31",
    status: "Aperto", opening_balance: 0, notes: marker
  }).select("id").single();
  assert.ifError(accountingYear.error);
  accountingFiscalYearId = accountingYear.data.id;

  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Contabilità" }).first().click();
  await adminPage.getByRole("heading", { name: "Contabilità e rendiconto", exact: true }).waitFor({ timeout: 20000 });
  await adminPage.locator(".filter-bar label").filter({ hasText: "Condominio" }).locator("select").selectOption(String(created.legacy_id));
  await adminPage.getByRole("button", { name: "Registro contabile", exact: true }).click();
  await adminPage.getByRole("button", { name: "+ Nuovo movimento", exact: true }).click();
  const ledgerModal = adminPage.locator(".modal-card").last();
  await ledgerModal.locator("label").filter({ hasText: "Data" }).locator("input").fill("2026-11-02");
  await ledgerModal.locator("label").filter({ hasText: "Categoria" }).locator("input").fill("Manutenzione QA");
  await ledgerModal.locator("label").filter({ hasText: "Importo" }).locator("input").fill("125.50");
  await ledgerModal.locator("label").filter({ hasText: "Descrizione" }).locator("input").fill(marker + "_SPESA_UI");
  await ledgerModal.locator("label").filter({ hasText: "Esercizio" }).locator("select").selectOption(accountingFiscalYearId);
  await ledgerModal.locator("label").filter({ hasText: "Note" }).locator("textarea").fill(marker);
  await ledgerModal.getByRole("button", { name: "Salva", exact: true }).click();
  let accountingLedger;
  try {
    accountingLedger = await waitForDbRow(
      () => cleanup.from("condominium_ledger_entries").select("id,amount,direction,description,fiscal_year_id,workspace_id,condominium_id").eq("workspace_id", created.workspace_id).eq("condominium_id", created.id).eq("description", marker + "_SPESA_UI").maybeSingle(),
      row => Boolean(row?.id),
      "APP-06 UI ledger movement persistence"
    );
  } catch (ledgerUiError) {
    console.log("APP06_LEDGER_UI_DEBUG", JSON.stringify({
      created,
      pageText: (await adminPage.locator("body").innerText()).slice(0, 7000),
      visibleErrors: await adminPage.locator(".alert.error").allInnerTexts().catch(() => []),
      modalText: await ledgerModal.innerText().catch(() => ""),
      fieldValues: {
        date: await ledgerModal.locator("label").filter({ hasText: "Data" }).locator("input").inputValue().catch(() => null),
        category: await ledgerModal.locator("label").filter({ hasText: "Categoria" }).locator("input").inputValue().catch(() => null),
        amount: await ledgerModal.locator("label").filter({ hasText: "Importo" }).locator("input").inputValue().catch(() => null),
        description: await ledgerModal.locator("label").filter({ hasText: "Descrizione" }).locator("input").inputValue().catch(() => null),
        fiscalYear: await ledgerModal.locator("label").filter({ hasText: "Esercizio" }).locator("select").inputValue().catch(() => null),
      },
      consoleErrors,
      pageErrors,
      failedRequests,
    }));
    throw ledgerUiError;
  }
  accountingLedgerId = accountingLedger.id;
  assert.equal(Number(accountingLedger.amount), 125.5);
  assert.equal(accountingLedger.direction, "Uscita");
  assert.equal(accountingLedger.fiscal_year_id, accountingFiscalYearId);

  await adminPage.getByRole("button", { name: "Ripartizioni", exact: true }).click();
  await adminPage.getByRole("button", { name: "+ Nuova ripartizione", exact: true }).click();
  const allocationModal = adminPage.locator(".modal-card").last();
  await allocationModal.locator("label").filter({ hasText: "Spesa" }).locator("select").selectOption(accountingLedgerId);
  await allocationModal.locator("label").filter({ hasText: "Unità" }).locator("select").selectOption(accountingUnit.data.id);
  await allocationModal.locator("label").filter({ hasText: "Millesimi" }).locator("input").fill("1000");
  await allocationModal.locator("label").filter({ hasText: "Importo" }).locator("input").fill("125.50");
  await allocationModal.locator("label").filter({ hasText: "Scadenza" }).locator("input").fill("2026-12-01");
  await allocationModal.locator("label").filter({ hasText: "Note" }).locator("textarea").fill(marker);
  await allocationModal.getByRole("button", { name: "Salva", exact: true }).click();
  const accountingAllocation = await waitForDbRow(
    () => cleanup.from("condominium_expense_allocations").select("id,amount,millesimi,ledger_entry_id,unit_id").eq("ledger_entry_id", accountingLedgerId).maybeSingle(),
    row => Boolean(row?.id),
    "APP-06 UI expense allocation persistence"
  );
  accountingAllocationId = accountingAllocation.id;
  assert.equal(Number(accountingAllocation.amount), 125.5);
  assert.equal(Number(accountingAllocation.millesimi), 1000);
  assert.equal(accountingAllocation.unit_id, accountingUnit.data.id);

  await adminPage.getByRole("button", { name: "Rate e morosità", exact: true }).click();
  await adminPage.getByRole("button", { name: "+ Nuova rata", exact: true }).click();
  const installmentModal = adminPage.locator(".modal-card").last();
  await installmentModal.locator("label").filter({ hasText: "Titolo" }).locator("input").fill(marker + "_RATA_UI");
  await installmentModal.locator("label").filter({ hasText: "Esercizio" }).locator("select").selectOption(accountingFiscalYearId);
  await installmentModal.locator("label").filter({ hasText: "Unità" }).locator("select").selectOption(accountingUnit.data.id);
  await installmentModal.locator("label").filter({ hasText: "Importo" }).locator("input").fill("125.50");
  await installmentModal.locator("label").filter({ hasText: "Scadenza" }).locator("input").fill("2026-12-15");
  await installmentModal.locator("label").filter({ hasText: "Note" }).locator("textarea").fill(marker);
  await installmentModal.getByRole("button", { name: "Salva", exact: true }).click();
  const accountingInstallment = await waitForDbRow(
    () => cleanup.from("condominium_installments").select("id,amount,status,unit_id").eq("condominium_id", created.id).eq("title", marker + "_RATA_UI").maybeSingle(),
    row => Boolean(row?.id),
    "APP-06 UI installment persistence"
  );
  accountingInstallmentId = accountingInstallment.id;
  assert.equal(Number(accountingInstallment.amount), 125.5);
  assert.equal(accountingInstallment.status, "Da pagare");
  assert.equal(accountingInstallment.unit_id, accountingUnit.data.id);
  results.push({ id: "APP-06", status: "PASS", checks: ["expense created from administrator UI and persisted at €125.50", "1,000-millesimi allocation saved from UI", "installment saved from UI with due date and unpaid state"] });

  // APP-08/11 UI acceptance: register and close a real whole-property transfer
  // on a separate unit with no outstanding financial positions.
  const transferUnit = await cleanup.from("condominium_units").select("id,unit_code").eq("condominium_id", created.id).order("created_at", { ascending: true }).range(1, 1).single();
  assert.ifError(transferUnit.error);
  const outgoingOwner = await cleanup.from("condominium_members").insert({
    condominium_id: created.id, unit_id: transferUnit.data.id,
    name: marker + "_CEDENTE_UI", email: null, role: "resident", active: true,
    data: { role: "Proprietario", current_owner: true, position_status: "Attivo", ownership_share: 100, bethag_qa_marker: marker }
  }).select("id").single();
  assert.ifError(outgoingOwner.error);
  accountingOutgoingMemberId = outgoingOwner.data.id;

  await adminPage.getByRole("button", { name: "Subentri e trasferimenti", exact: true }).click();
  await adminPage.getByRole("heading", { name: "Nuovo subentro", exact: true }).waitFor({ timeout: 10000 });
  // Entering the condominium registry triggers the application's normal
  // authoritative workspace hydration. Return to the transfer module only
  // after that refresh has completed, then assert the owner in the actual UI.
  // Rehydrate the workspace after the service-role fixture insert, then
  // explicitly select the test condominium in AccountingPage. The transfer
  // panel is scoped to one condominium and otherwise renders its empty prompt.
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first().click();
  await adminPage.getByRole("heading", { name: "Condomìni", exact: true }).waitFor({ timeout: 15000 });
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Contabilità" }).first().click();
  await adminPage.getByRole("heading", { name: "Contabilità e rendiconto", exact: true }).waitFor({ timeout: 15000 });
  await adminPage.locator(".filter-bar label").filter({ hasText: "Condominio" }).locator("select").selectOption(String(created.legacy_id));
  await adminPage.getByRole("button", { name: "Subentri e trasferimenti", exact: true }).click();
  await adminPage.getByRole("heading", { name: "Nuovo subentro", exact: true }).waitFor({ timeout: 15000 });
  await adminPage.locator("label").filter({ hasText: "Data rogito / trasferimento" }).locator("input").fill("2026-11-02");
  await adminPage.locator("label").filter({ hasText: "Nome e cognome" }).locator("input").fill(marker + "_ACQUIRENTE_UI");
  await adminPage.locator("label").filter({ hasText: "Email" }).locator("input").fill("bethag-ui-transfer-" + Date.now() + "@example.com");
  await adminPage.locator("label").filter({ hasText: "Note" }).locator("textarea").fill(marker);
  const previewButton = adminPage.getByRole("button", { name: "Aggiorna anteprima contabile", exact: true });
  const automaticPreview = adminPage.waitForResponse(response =>
    response.url().includes("/rest/v1/rpc/preview_condominium_member_transfer"),
    { timeout: 20000 }
  );
  await adminPage.locator("label").filter({ hasText: "Unità immobiliare" }).locator("select").selectOption(transferUnit.data.id);
  await adminPage.locator("label").filter({ hasText: "Proprietario/i uscente/i" }).getByText(marker + "_CEDENTE_UI", { exact: true }).waitFor({ timeout: 15000 });
  const automaticPreviewResult = await automaticPreview;
  if (!automaticPreviewResult.ok()) {
    const responseBody = await automaticPreviewResult.text().catch(() => "");
    throw new Error(`APP-08/11 automatic preview RPC failed: HTTP ${automaticPreviewResult.status()} ${responseBody.slice(0, 2000)}`);
  }
  await adminPage.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button"))
      .find(item => item.textContent?.trim() === "Aggiorna anteprima contabile");
    return Boolean(button && !button.hasAttribute("disabled"));
  }, null, { timeout: 15000 });
  const previewResponse = adminPage.waitForResponse(response =>
    response.url().includes("/rest/v1/rpc/preview_condominium_member_transfer"),
    { timeout: 20000 }
  );
  await previewButton.click();
  const previewResult = await previewResponse;
  if (!previewResult.ok()) {
    const responseBody = await previewResult.text().catch(() => "");
    throw new Error(`APP-08/11 preview RPC failed: HTTP ${previewResult.status()} ${responseBody.slice(0, 2000)}`);
  }
  await adminPage.getByRole("button", { name: "Verifica e conferma dati", exact: true }).click();
  await adminPage.getByRole("heading", { name: "Conferma i dati del subentro", exact: true }).waitFor({ timeout: 10000 });
  await adminPage.getByRole("button", { name: "Conferma definitivamente il trasferimento", exact: true }).click();
  const confirmedTransfer = await waitForDbRow(
    () => cleanup.from("condominium_member_transfers").select("id,status,transfer_date,unit_id,outgoing_member_id,incoming_member_id,notes,data").eq("unit_id", transferUnit.data.id).eq("notes", marker).maybeSingle(),
    row => Boolean(row?.id && row.status === "Confermato"),
    "APP-08/11 UI transfer confirmation"
  );
  accountingTransferId = confirmedTransfer.id;
  accountingIncomingMemberId = confirmedTransfer.incoming_member_id;
  assert.equal(confirmedTransfer.outgoing_member_id, accountingOutgoingMemberId);
  const transferCard = adminPage.locator(".row-card").filter({ hasText: marker + "_ACQUIRENTE_UI" });
  await transferCard.getByRole("button", { name: "Chiudi posizione", exact: true }).waitFor({ timeout: 15000 });
  await transferCard.getByRole("button", { name: "Chiudi posizione", exact: true }).click();
  const closedTransfer = await waitForDbRow(
    () => cleanup.from("condominium_member_transfers").select("id,status").eq("id", accountingTransferId).single(),
    row => row?.status === "Chiuso",
    "APP-08/11 UI transfer closure"
  );
  assert.equal(closedTransfer.status, "Chiuso");
  const outgoingAfterClosure = await cleanup.from("condominium_members").select("active,data").eq("id", accountingOutgoingMemberId).single();
  assert.ifError(outgoingAfterClosure.error);
  assert.equal(outgoingAfterClosure.data.active, false);

  // Verify the owner list is refreshed from the server when returning to the
  // condominium registry after confirmation/closure, without a hard reload.
  const incomingOwnerRefresh = adminPage.waitForResponse(async response => {
    const requestUrl = new URL(response.url());
    if (!requestUrl.pathname.endsWith("/rest/v1/condominium_members") || !response.ok()) return false;
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) && rows.some(row =>
      String(row.id) === String(confirmedTransfer.incoming_member_id) && row.active === true
    );
  }, { timeout: 20000 });
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first().click();
  await adminPage.getByRole("heading", { name: "Condomìni", exact: true }).waitFor({ timeout: 15000 });
  await incomingOwnerRefresh;
  const refreshedCondominiumCard = adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).first();
  await refreshedCondominiumCard.getByRole("button", { name: "Dettagli", exact: true }).click();
  await adminPage.locator(".detail-page-header h1").filter({ hasText: editedCondoName }).waitFor({ timeout: 10000 });
  const refreshedUnitCard = adminPage.locator(".request-card").filter({ hasText: "Unità " + transferUnit.data.unit_code }).first();
  await refreshedUnitCard.getByRole("button", { name: "Apri scheda di " + marker + "_ACQUIRENTE_UI", exact: true }).waitFor({ timeout: 15000 });
  assert.equal(await refreshedUnitCard.getByRole("button", { name: "Apri scheda di " + marker + "_CEDENTE_UI", exact: true }).count(), 0);

  results.push({ id: "APP-08/11", status: "PASS", checks: ["transfer preview generated from UI", "administrator confirmed whole-property transfer from UI", "zero-balance position closed from UI", "outgoing owner archived and inactive", "incoming owner refreshed and visible in current property list after navigation without hard reload"] });

  temporaryResidentEmail = "bethag-ui-" + marker.toLowerCase().replace(/[^a-z0-9]/g, "") + "@example.com";
  temporaryResidentPassword = randomBytes(24).toString("base64url");
  const temporaryResident = await cleanup.auth.admin.createUser({
    email: temporaryResidentEmail,
    password: temporaryResidentPassword,
    email_confirm: true,
    user_metadata: { source: marker, role: "resident" },
  });
  assert.ifError(temporaryResident.error);
  temporaryResidentId = temporaryResident.data.user.id;
  const residentUnit = await cleanup.from("condominium_units")
    .select("id,unit_code")
    .eq("condominium_id", created.id)
    .limit(1)
    .single();
  assert.ifError(residentUnit.error);
  const member = await cleanup.from("condominium_members").insert({
    condominium_id: created.id,
    user_id: temporaryResidentId,
    name: "BETHAG QA UI Resident",
    email: temporaryResidentEmail,
    role: "resident",
    active: true,
    permissions: {},
    data: { source: marker },
    unit_id: residentUnit.data.id,
  }).select("id").single();
  assert.ifError(member.error);
  const portalAccess = await cleanup.from("portal_access").insert({
    workspace_id: created.workspace_id,
    condominium_id: created.id,
    name: "BETHAG QA UI Resident",
    email: temporaryResidentEmail,
    role: "resident",
    apartment: residentUnit.data.unit_code,
    permissions: ["comunicazioni"],
    active: true,
    user_id: temporaryResidentId,
    member_id: member.data.id,
    data: { source: marker },
  }).select("id").single();
  assert.ifError(portalAccess.error);

  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Comunicazioni" }).first().click();
  try { await adminPage.locator(".page-header h1").filter({ hasText: "Comunicazioni" }).waitFor({ timeout: 15000 }); }
  catch (e) {
    const body = (await adminPage.locator("body").innerText()).slice(0, 3500);
    const sidebar = (await adminPage.locator(".sidebar").innerText().catch(() => "")).slice(0, 1200);
    throw new Error("Comunicazioni navigation did not open. URL=" + adminPage.url() + " Sidebar=" + sidebar + " Body=" + body + " PageErrors=" + JSON.stringify(pageErrors) + " Cause=" + e.message);
  }
  const newCommunicationButton = adminPage.locator(".page-header").getByRole("button", { name: "+ Nuova comunicazione" });
  try { await newCommunicationButton.waitFor({ state: "visible", timeout: 15000 }); }
  catch (e) { const visible = (await adminPage.locator("body").innerText()).slice(0, 2500); throw new Error("Administrator communication action is missing. Body=" + visible + " Cause=" + e.message); }
  await newCommunicationButton.click();
  await adminPage.getByRole("heading", { name: "Nuova comunicazione al Portale" }).waitFor();
  await field(adminPage, "Titolo *").fill(communicationTitle);
  await adminPage.locator(".modal .field").filter({ hasText: "Condominio" }).locator("select").first().selectOption({ label: editedCondoName });
  await field(adminPage, "Contenuto *").fill("Messaggio sintetico di verifica UI BETHAG.");
  const portalCheckbox = adminPage.locator(".modal .checkbox-field input[type='checkbox']").first();
  if (!(await portalCheckbox.isChecked())) await portalCheckbox.check();
  await adminPage.getByRole("button", { name: "Salva", exact: true }).click();
  const commCard = adminPage.locator(".communication-card").filter({ hasText: communicationTitle });
  await commCard.waitFor({ timeout: 20000 });
  let persistedCommunication;
  try {
    persistedCommunication = await waitForDbRow(
      () => cleanup.from("communications").select("id,published,condominium_id,legacy_id,title,data").eq("title", communicationTitle).maybeSingle(),
      row => Boolean(row?.published === true && row?.condominium_id === created.id),
      "Published communication backend persistence",
      20000
    );
  } catch (syncError) {
    const storedRows = await cleanup.from("communications").select("id,title,published,condominium_id,workspace_id,data").eq("workspace_id", created.workspace_id).like("title", marker + "%");
    throw new Error("Communication sync failed: " + JSON.stringify({
      cause: syncError.message,
      rows: storedRows.data,
      rowsError: storedRows.error?.message,
      consoleErrors,
      failedRequests,
      pageErrors,
      adminBody: (await adminPage.locator("body").innerText()).slice(0, 4000),
    }));
  }
  assert.equal(persistedCommunication.published, true);
  assert.equal(persistedCommunication.condominium_id, created.id);
  const persistedPortalAccess = await cleanup.from("portal_access")
    .select("id,active,user_id,condominium_id,permissions")
    .eq("id", portalAccess.data.id)
    .single();
  assert.ifError(persistedPortalAccess.error);
  if (persistedPortalAccess.data.active !== true) {
    const residentMemberState = await cleanup.from("condominium_members")
      .select("id,legacy_id,active,user_id,email,data,unit_id,condominium_id")
      .eq("id", member.data.id)
      .maybeSingle();
    console.log("APP12_PORTAL_ACCESS_DEBUG", JSON.stringify({
      portalAccess: persistedPortalAccess.data,
      residentMember: residentMemberState.data,
      residentMemberError: residentMemberState.error?.message,
      expectedUserId: temporaryResidentId,
      consoleErrors,
      failedRequests,
    }));
  }
  assert.equal(persistedPortalAccess.data.active, true);
  assert.equal(persistedPortalAccess.data.user_id, temporaryResidentId);
  assert.equal(persistedPortalAccess.data.condominium_id, created.id);
  assert.ok(persistedPortalAccess.data.permissions.includes("comunicazioni"));

  const residentContext = await browser.newContext();
  const residentPage = await residentContext.newPage();
  await signIn(residentPage, "Condomino", temporaryResidentEmail, temporaryResidentPassword, "Portale condòmino");
  try {
    await residentPage.getByText(communicationTitle, { exact: true }).waitFor({ timeout: 15000 });
  } catch (visibilityError) {
    console.log("APP12_RESIDENT_VISIBILITY_DEBUG", JSON.stringify({
      body: (await residentPage.locator("body").innerText()).slice(0, 4000),
      pageErrors,
      consoleErrors,
      failedRequests,
      communication: persistedCommunication,
      portalAccess: persistedPortalAccess.data,
    }));
    throw visibilityError;
  }

  await commCard.getByRole("button", { name: "Ritira" }).click();
  await residentPage.reload({ waitUntil: "domcontentloaded" });
  await residentPage.getByText(communicationTitle, { exact: true }).waitFor({ state: "detached", timeout: 15000 });
  await commCard.locator(".mini-danger").click();
  await commCard.waitFor({ state: "detached", timeout: 20000 });
  results.push({ id: "APP-12", status: "PASS", checks: ["administrator created and published communication from UI", "resident saw published communication", "administrator withdrew publication", "resident lost visibility after withdrawal", "communication deleted from UI"] });

  // Allow the app's debounced background synchronization to settle before
  // teardown. Only ERR_ABORTED events emitted after this point are teardown
  // noise; backend errors or network failures before teardown remain failures.
  await adminPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await adminPage.waitForTimeout(1000);
  browserTeardownStarted = true;
  await residentContext.close();
  await adminContext.close();
  assert.deepEqual(pageErrors, []);
  const backendSyncErrorsBeforeTeardown = consoleErrorEvents.filter(event =>
    !event.duringTeardown && event.text.includes("BETHAG backend sync failed")
  );
  assert.deepEqual(
    backendSyncErrorsBeforeTeardown,
    [],
    "Backend synchronization must not fail before browser teardown: " + JSON.stringify({ backendSyncErrorsBeforeTeardown, failedRequests })
  );
  const backendNetworkFailures = failedRequests.filter(request =>
    /\/rest\/v1\/(?:condominium_members|condominium_units|portal_access)/.test(request.url) &&
    !(request.error === "net::ERR_ABORTED" && request.duringTeardown)
  );
  assert.deepEqual(
    backendNetworkFailures,
    [],
    "Backend requests may be aborted only by browser teardown; all other failures are unexpected: " + JSON.stringify({ backendNetworkFailures, failedRequests })
  );
  const backendHttpFailures = failedRequests.filter(request =>
    request.status >= 400 && /\/rest\/v1\/(?:condominium_members|condominium_units|portal_access)/.test(request.url)
  );
  assert.deepEqual(backendHttpFailures, [], "Backend synchronization must not produce HTTP errors");
  const portalAccessConflicts = failedRequests.filter(request =>
    request.url.includes("/rest/v1/portal_access") && request.status === 409
  );
  assert.deepEqual(portalAccessConflicts, [], "Portal access synchronization must not produce HTTP 409 duplicate conflicts");
} finally {
  await cleanupFixtures();
  await browser.close();
}
console.log(JSON.stringify({ suite: "BETHAG_QA_BROWSER_WORKFLOWS", target: "jhuyhlzzydcgghrzeexn", results, pageErrors, cleanup: "service-role cleanup verified" }, null, 2));
if (results.length !== 4 || results.some(x => x.status !== "PASS")) process.exitCode = 1;
if (consoleErrors.length) console.log("BETHAG_BROWSER_CONSOLE_ERRORS", JSON.stringify(consoleErrors));
if (failedRequests.length) console.log("BETHAG_BROWSER_FAILED_REQUESTS", JSON.stringify(failedRequests));

// Re-run marker: strict-mode heading selector uses the unique h1 after save.

// Retry after QA-only EXECUTE grant for the guarded private condominium deletion RPC.
// QA browser acceptance rerun after async restore hydration fix 2026-11-02
// QA accounting UI rerun after actionable error banner 2026-11-02
// QA accounting UI rerun after ISO date validator correction 2026-11-02
