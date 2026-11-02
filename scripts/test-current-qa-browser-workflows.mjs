import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

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
const condominiumLookupRequests = [];
let temporaryResidentId = null;
let temporaryResidentEmail = null;
let temporaryResidentPassword = null;

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
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  adminPage.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" }));
  adminPage.on("response", response => { if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() }); });
  adminPage.on("request", request => {
    const requestUrl = request.url();
    if (requestUrl.includes("/rest/v1/condominiums?") && requestUrl.includes("select=id%2Clegacy_id")) {
      condominiumLookupRequests.push(requestUrl);
    }
  });
  const dialogs = [];
  adminPage.on("dialog", async d => { dialogs.push({ type: d.type(), message: d.message() }); await d.accept(); });
  const backendCollectionCacheKeys = [
    "bethag-condominiums-v5", "bethag-deadlines-v5", "bethag-documents-v5",
    "bethag-assemblies-v5", "bethag-suppliers-v5", "bethag-activities-v5",
    "bethag-condominium-works-v1", "bethag-communications-v1",
    "bethag-condominium-members-v1", "bethag-condominium-requests-v1",
    "bethag-portal-members-v2", "bethag-collaborators-v1",
  ];
  // Simulate stale snapshots left by earlier versions; startup must purge them
  // before the authenticated workflow can write any new local state.
  await adminPage.goto(baseURL, { waitUntil: "networkidle" });
  await adminPage.evaluate((keys) => keys.forEach((key) =>
    localStorage.setItem(key, JSON.stringify([{ staleLegacySnapshot: true }]))), backendCollectionCacheKeys);
  await adminPage.reload({ waitUntil: "networkidle" });

  await signIn(adminPage, "Amministratore", "bethag-admin-qa@example.com", adminPassword, "Homepage");

  const persistedBackendCollections = await adminPage.evaluate((keys) =>
    keys.filter((key) => localStorage.getItem(key) !== null), backendCollectionCacheKeys);
  assert.deepEqual(persistedBackendCollections, [],
    "Supabase-backed collections must not be duplicated in localStorage");
  console.log("QA_LOCAL_CACHE_POLICY_PASS", JSON.stringify({ checked: backendCollectionCacheKeys.length }));

  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first().click();
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
  const created = await waitForDbRow(
    () => cleanup.from("condominiums").select("id,workspace_id,legacy_id").eq("name", condoName).maybeSingle(),
    row => Boolean(row?.id),
    "Condominium creation persistence"
  );
  try {
    await adminPage.locator("h1").filter({ hasText: condoName }).first().waitFor({ timeout: 30000 });
  } catch (createUiError) {
    console.log("APP05_CREATE_UI_DEBUG", JSON.stringify({
      url: adminPage.url(),
      pageText: (await adminPage.locator("body").innerText()).slice(0, 5000),
      created,
      dialogs,
      consoleErrors,
      failedRequests,
      pageErrors,
    }));
    throw createUiError;
  }
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
  const archived = await waitForDbRow(
    () => cleanup.from("condominiums").select("id,archived_at,archived_by,archive_reason").eq("id", created.id).single(),
    row => Boolean(row?.archived_at && row?.archived_by),
    "Condominium archive persistence"
  );
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

  await archiveCard.getByRole("button", { name: "Ripristina" }).click();
  await archiveCard.waitFor({ state: "detached", timeout: 15000 });
  const restored = await waitForDbRow(
    () => cleanup.from("condominiums").select("archived_at,archived_by,archive_reason").eq("id", created.id).single(),
    row => row?.archived_at === null && row?.archived_by === null && row?.archive_reason === null,
    "Condominium restore persistence"
  );
  // The archive route hydrates a large workspace in the background. Wait for
  // document readiness, then assert the actual restored record after refresh;
  // networkidle is not a reliable condition while paginated data is loading.
  await adminPage.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await adminPage.locator(".sidebar .nav-item").filter({ hasText: "Condomini" }).first().waitFor({ timeout: 30000 });
  assert.ok(
    !consoleErrors.some((message) => message.includes("Could not find the 'data' column of 'workspace_members'")),
    "Collaborator background sync must not reference a missing workspace_members.data column"
  );
  try {
    await adminPage.getByRole("heading", { name: "Condomìni", exact: true }).waitFor({ timeout: 10000 });
    await adminPage.locator(".entity-card").filter({ hasText: editedCondoName }).waitFor({ timeout: 60000 });
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
  assert.ok(condominiumLookupRequests.length > 0, "Expected a targeted condominium ID lookup");
  assert.ok(condominiumLookupRequests.every(url => !/[?&]offset=/.test(url)),
    "Background sync must not paginate through the entire condominium workspace");
  const persistedPortalAccess = await cleanup.from("portal_access")
    .select("id,active,user_id,condominium_id,permissions")
    .eq("id", portalAccess.data.id)
    .single();
  assert.ifError(persistedPortalAccess.error);
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
  // Publication changes are persisted by the debounced backend sync; wait for
  // the authoritative row before reloading the resident session, otherwise
  // the browser test races the 500ms save queue rather than testing visibility.
  const withdrawnCommunication = await waitForDbRow(
    () => cleanup.from("communications").select("published").eq("id", persistedCommunication.id).single(),
    row => row?.published === false,
    "Communication withdrawal persistence",
    20000
  );
  assert.equal(withdrawnCommunication.published, false);
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
if (consoleErrors.length) console.log("BETHAG_BROWSER_CONSOLE_ERRORS", JSON.stringify(consoleErrors));
if (failedRequests.length) console.log("BETHAG_BROWSER_FAILED_REQUESTS", JSON.stringify(failedRequests));

// Expand the same authenticated QA run to the independent RPC acceptance
// suites. Both scripts use only the approved QA project and clean up their
// temporary fixtures in finally blocks.
for (const script of ["scripts/test-current-qa-app08-11.mjs"]) {
  console.log("BETHAG_QA_EXTENDED_SUITE_START", script);
  const child = spawnSync(process.execPath, [script], { stdio: "inherit", env: process.env });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error("Extended QA suite failed: " + script + " (exit " + child.status + ")");
  console.log("BETHAG_QA_EXTENDED_SUITE_PASS", script);
}

// Re-run marker: strict-mode heading selector uses the unique h1 after save.

// Retry after QA-only EXECUTE grant for the guarded private condominium deletion RPC.
