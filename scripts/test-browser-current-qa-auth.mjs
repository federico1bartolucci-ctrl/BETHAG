import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.BETHAG_QA_BASE_URL || "http://127.0.0.1:4173/BETHAG/";
const accounts = [
  { role: "Amministratore", email: "bethag-admin-qa@example.com", password: process.env.BETHAG_QA_ADMIN_PASSWORD, expected: "Homepage" },
  { role: "Collaboratore", email: "bethag-collaboratore-qa@example.com", password: process.env.BETHAG_QA_COLLABORATOR_PASSWORD, expected: "Homepage" },
  { role: "Condomino", email: "bethag-condomino-qa@example.com", password: process.env.BETHAG_QA_RESIDENT_PASSWORD, expected: "Portale condòmino" },
];
for (const a of accounts) assert.ok(a.password, "Missing QA password secret for " + a.role);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const account of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    try {
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Accedi" }).first().click();
      await page.getByRole("heading", { name: "Accedi a BETHAG" }).waitFor();
      await page.getByRole("button", { name: account.role, exact: true }).click();
      await page.locator('input[type="email"]').first().fill(account.email);
      await page.locator('input[autocomplete="current-password"]').first().fill(account.password);
      await page.getByRole("button", { name: "Accedi", exact: true }).last().click();
      await page.getByText(account.expected, { exact: true }).first().waitFor({ timeout: 25000 });
      assert.deepEqual(errors, [], "Browser errors: " + errors.join(" | "));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByText(account.expected, { exact: true }).first().waitFor({ timeout: 20000 });
      results.push({ role: account.role, status: "PASS", checks: ["Supabase Auth sign-in", "role-specific landing", "refresh/session persistence", "no uncaught page errors"] });
    } catch (e) {
      let visible = "";
      try { visible = (await page.locator("body").innerText()).slice(0, 1000); } catch {}
      results.push({ role: account.role, status: "FAIL", error: String(e.message).slice(0, 400), pageErrors: errors, visible });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ suite: "BETHAG_CURRENT_QA_REAL_AUTH", target: "jhuyhlzzydcgghrzeexn", results }, null, 2));
if (results.some(x => x.status !== "PASS")) process.exitCode = 1;
