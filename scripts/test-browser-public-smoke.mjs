import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseURL = process.env.BETHAG_SMOKE_BASE_URL || "http://127.0.0.1:4173";
const ownsServer = !process.env.BETHAG_SMOKE_BASE_URL;
let server;
let browser;

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(300);
  }
  throw new Error(`BETHAG preview did not become ready at ${url}`);
}

try {
  if (ownsServer) {
    server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    await waitForServer(baseURL);
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Accedi" }).first().click();
  await page.getByRole("heading", { name: "Accedi a BETHAG" }).waitFor();

  for (const role of ["Amministratore", "Collaboratore", "Condomino"]) {
    const button = page.getByRole("button", { name: role, exact: true });
    await button.waitFor();
    await button.click();
  }

  await page.getByRole("button", { name: "Accedi", exact: true }).last().click();
  await page.getByRole("alert").getByText("Inserisci l'indirizzo e-mail.").waitFor();

  // Test the reset-password page without calling Supabase or using real credentials.
  // A minimal auth mock makes this deterministic and proves the invalid-link guard renders.
  await page.route("https://esm.sh/@supabase/supabase-js@2.117.1*", route => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: `export function createClient() {
      return { auth: {
        onAuthStateChange() {},
        getSession: async () => ({ data: { session: null }, error: null }),
      } };
    }`,
  }));
  await page.goto(new URL("reset-password.html", new URL("BETHAG/", baseURL)).toString(), { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Reimposta la password" }).waitFor();
  await page.getByText("Link di recupero non valido o scaduto. Richiedi un nuovo link.").waitFor();

  // Simulate a valid recovery session and verify client-side password mismatch validation.
  // updateUser deliberately throws if reached: this test must never change any account.
  await page.unroute("https://esm.sh/@supabase/supabase-js@2.117.1*");
  await page.route("https://esm.sh/@supabase/supabase-js@2.117.1*", route => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: `export function createClient() {
      const session = { user: { id: "synthetic-qa-user" } };
      return { auth: {
        onAuthStateChange(callback) {
          callback("PASSWORD_RECOVERY", session);
          return { data: { subscription: { unsubscribe() {} } } };
        },
        exchangeCodeForSession: async () => ({ error: null }),
        getSession: async () => ({ data: { session }, error: null }),
        updateUser: async () => { throw new Error("updateUser must not run for mismatched passwords"); },
        signOut: async () => ({ error: null }),
      } };
    }`,
  }));
  await page.goto(new URL("reset-password.html?code=synthetic-qa-code", new URL("BETHAG/", baseURL)).toString(), { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Nuova password", exact: true }).fill("Password123");
  await page.getByLabel("Conferma nuova password").fill("Password456");
  await page.getByRole("button", { name: "Salva nuova password" }).click();
  await page.getByText("Le password non coincidono.").waitFor();

  // Exercise the successful UI path using a synthetic recovery session only.
  // Counters prove updateUser and local sign-out each run exactly once; no real account is contacted.
  await page.unroute("https://esm.sh/@supabase/supabase-js@2.117.1*");
  await page.route("https://esm.sh/@supabase/supabase-js@2.117.1*", route => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: `export function createClient() {
      const session = { user: { id: "synthetic-qa-user" } };
      window.__qaRecoveryCalls = { updateUser: 0, signOut: 0 };
      return { auth: {
        onAuthStateChange(callback) {
          callback("PASSWORD_RECOVERY", session);
          return { data: { subscription: { unsubscribe() {} } } };
        },
        exchangeCodeForSession: async () => ({ error: null }),
        getSession: async () => ({ data: { session }, error: null }),
        updateUser: async () => { window.__qaRecoveryCalls.updateUser += 1; return { error: null }; },
        signOut: async () => { window.__qaRecoveryCalls.signOut += 1; return { error: null }; },
      } };
    }`,
  }));
  await page.goto(new URL("reset-password.html?code=synthetic-qa-code", new URL("BETHAG/", baseURL)).toString(), { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "Nuova password", exact: true }).fill("Password123");
  await page.getByLabel("Conferma nuova password").fill("Password123");
  await page.getByRole("button", { name: "Salva nuova password" }).click();
  await page.getByText("Password aggiornata correttamente. Ora puoi accedere a BETHAG.").waitFor();
  const recoveryCalls = await page.evaluate(() => window.__qaRecoveryCalls);
  if (recoveryCalls?.updateUser !== 1 || recoveryCalls?.signOut !== 1) {
    throw new Error(`Unexpected successful recovery calls: ${JSON.stringify(recoveryCalls)}`);
  }

  if (pageErrors.length) {
    throw new Error(`Browser uncaught errors: ${pageErrors.join(" | ")}`);
  }

  console.log("BETHAG_PUBLIC_BROWSER_SMOKE_PASS");
  console.log("Checks: landing page loads; login panel opens; administrator/collaborator/resident role selectors render; empty login is rejected; invalid recovery links are rejected; mismatched new passwords are rejected before updateUser; successful recovery shows confirmation and calls updateUser/signOut once; no uncaught browser exceptions. Supabase auth is mocked; no real account is changed.");
} catch (error) {
  console.error("BETHAG_PUBLIC_BROWSER_SMOKE_FAIL");
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) {
    server.kill("SIGTERM");
  }
}
