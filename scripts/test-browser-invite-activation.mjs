import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseURL = "http://127.0.0.1:4174/BETHAG/invite-accept.html";
let server;
let browser;
async function waitForServer(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await delay(300);
  }
  throw new Error("BETHAG preview did not become ready for invite activation test");
}
const mockModule = `export function createClient() {
  const mode = window.__inviteTestMode || "success";
  const calls = window.__inviteCalls = { setSession: 0, updateUser: 0, signOut: 0 };
  const session = { user: { id: "synthetic-invite-user" } };
  return { auth: {
    setSession: async ({ access_token, refresh_token }) => {
      calls.setSession++;
      return access_token === "synthetic-access" && refresh_token === "synthetic-refresh"
        ? { data: { session }, error: null }
        : { data: { session: null }, error: { message: "invalid synthetic tokens" } };
    },
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: { id: session.user.id, user_metadata: {
      bethag_role: mode === "wrong-role" ? "admin" : "collaborator"
    } } }, error: null }),
    updateUser: async () => { calls.updateUser++; return { data: { user: session.user }, error: null }; },
    signOut: async ({ scope }) => { calls.signOut++; calls.signOutScope = scope; return { error: null }; }
  } };
}`;

try {
  server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4174", "--strictPort"], { stdio: "inherit", shell: process.platform === "win32" });
  await waitForServer(baseURL);
  browser = await chromium.launch({ headless: true });

  const success = await browser.newPage();
  await success.addInitScript(() => { window.__inviteTestMode = "success"; });
  await success.route("https://esm.sh/@supabase/supabase-js@2.117.1*", route => route.fulfill({
    status: 200, contentType: "application/javascript; charset=utf-8", body: mockModule
  }));
  await success.goto(baseURL + "#access_token=synthetic-access&refresh_token=synthetic-refresh&type=invite", { waitUntil: "networkidle" });
  await success.getByLabel("Nuova password").fill("SyntheticPass123!");
  await success.getByLabel("Conferma password").fill("SyntheticPass123!");
  await success.getByRole("button", { name: "Attiva account" }).click();
  await success.getByText("Account collaboratore attivato.", { exact: false }).waitFor();
  const calls = await success.evaluate(() => window.__inviteCalls);
  if (calls.setSession !== 1 || calls.updateUser !== 1 || calls.signOut !== 1 || calls.signOutScope !== "local") {
    throw new Error("Invite success path did not use expected isolated auth calls: " + JSON.stringify(calls));
  }

  const rejected = await browser.newPage();
  await rejected.addInitScript(() => { window.__inviteTestMode = "wrong-role"; });
  await rejected.route("https://esm.sh/@supabase/supabase-js@2.117.1*", route => route.fulfill({
    status: 200, contentType: "application/javascript; charset=utf-8", body: mockModule
  }));
  await rejected.goto(baseURL + "#access_token=synthetic-access&refresh_token=synthetic-refresh&type=invite", { waitUntil: "networkidle" });
  await rejected.getByText("Il collegamento non corrisponde a un invito collaboratore BETHAG.").waitFor();
  if (await rejected.locator("#form").isVisible()) throw new Error("Non-collaborator session was allowed to activate");

  console.log("BETHAG_INVITE_ACTIVATION_BROWSER_TEST_PASS");
  console.log("Synthetic checks: implicit invite tokens accepted; collaborator role required; password update called once; local-only sign-out called once. No real Supabase account or session was used.");
} catch (error) {
  console.error("BETHAG_INVITE_ACTIVATION_BROWSER_TEST_FAIL");
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
