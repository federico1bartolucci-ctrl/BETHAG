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

  if (pageErrors.length) {
    throw new Error(`Browser uncaught errors: ${pageErrors.join(" | ")}`);
  }

  console.log("BETHAG_PUBLIC_BROWSER_SMOKE_PASS");
  console.log("Checks: landing page loads; login panel opens; administrator/collaborator/resident role selectors render; empty login is rejected with validation feedback; no uncaught browser exceptions.");
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
