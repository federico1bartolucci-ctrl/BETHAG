import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = (process.env.BETHAG_QA_BASE_URL || "https://federico1bartolucci-ctrl.github.io/BETHAG/").replace(/\/$/, "");
const accounts = [
  { role: "Amministratore", email: process.env.BETHAG_QA_ADMIN_EMAIL || "bethag-admin-qa@example.com", password: process.env.BETHAG_QA_ADMIN_PASSWORD, expected: "Homepage" },
  { role: "Collaboratore", email: process.env.BETHAG_QA_COLLABORATOR_EMAIL || "bethag-collaboratore-qa@example.com", password: process.env.BETHAG_QA_COLLABORATOR_PASSWORD, expected: "Homepage" },
  { role: "Condomino", email: process.env.BETHAG_QA_RESIDENT_EMAIL || "bethag-condomino-qa@example.com", password: process.env.BETHAG_QA_RESIDENT_PASSWORD, expected: "Portale condòmino" },
];

for (const account of accounts) {
  assert.ok(account.password, `Missing password environment variable for role ${account.role}; do not commit or print credentials.`);
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const account of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    const dialogs = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("dialog", async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message().slice(0, 300) });
      await dialog.dismiss();
    });

    try {
      await page.goto(baseURL, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Accedi" }).first().click();
      await page.getByRole("heading", { name: "Accedi a BETHAG" }).waitFor();
      await page.getByRole("button", { name: account.role, exact: true }).click();
      await page.locator('input[type="email"]').first().fill(account.email);
      await page.locator('input[autocomplete="current-password"]').first().fill(account.password);
      await page.getByRole("button", { name: "Accedi", exact: true }).last().click();

      if (account.role === "Condomino") {
        await page.getByText("Portale condòmino", { exact: true }).waitFor({ timeout: 20000 });
      } else {
        await page.getByText("Homepage", { exact: true }).first().waitFor({ timeout: 20000 });
      }

      assert.deepEqual(pageErrors, [], `Uncaught browser errors for role ${account.role}: ${pageErrors.join(" | ")}`);
      await page.reload({ waitUntil: "networkidle" });

      if (account.role === "Condomino") {
        await page.getByText("Portale condòmino", { exact: true }).waitFor({ timeout: 20000 });
        await page.getByRole("button", { name: "Esci", exact: true }).waitFor();
      } else {
        await page.getByText("Homepage", { exact: true }).first().waitFor({ timeout: 20000 });
      }

      assert.deepEqual(pageErrors, [], `Uncaught browser errors after refresh for role ${account.role}: ${pageErrors.join(" | ")}`);

      const navigationChecks = [];
      if (account.role !== "Condomino") {
        // Use pages that are available on the QA fixture's Free plan. Paid modules
        // intentionally open an upgrade prompt and must not be treated as navigation failures.
        for (const label of ["Registro e sicurezza", "Homepage"]) {
          const navItem = page.locator(".nav-item").filter({ hasText: label }).first();
          await navItem.waitFor({ state: "visible", timeout: 10000 });
          await navItem.click();
          await page.locator(".nav-item.active").filter({ hasText: label }).waitFor({ state: "visible", timeout: 10000 });
          navigationChecks.push(label);
        }
        assert.deepEqual(pageErrors, [], `Uncaught browser errors during navigation for role ${account.role}: ${pageErrors.join(" | ")}`);
      }

      results.push({ role: account.role, status: "PASS", checks: ["real Supabase sign-in", "role-specific landing", "refresh/session persistence", "no uncaught browser errors before and after refresh", ...(navigationChecks.length ? [`navigation: ${navigationChecks.join(", ")}`] : [])] });
    } catch (error) {
      let visibleText = "";
      try { visibleText = (await page.locator("body").innerText({ timeout: 3000 })).slice(0, 1200); } catch {}
      results.push({ role: account.role, status: "FAIL", url: page.url(), error: String(error?.message || error).slice(0, 500), dialogs, pageErrors, visibleText });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ suite: "BETHAG_REAL_QA_AUTH_SMOKE", baseURL, results }, null, 2));
if (results.some(result => result.status !== "PASS")) process.exitCode = 1;
