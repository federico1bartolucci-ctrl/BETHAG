import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { establishRecoverySession } from "../public/reset-password/recovery-session.js";

const expectedSession = { user: { id: "user-recovery-test" } };
function mockAuth({ session = null, exchangeError = null, setError = null, getError = null } = {}) {
  const calls = { exchange: [], setSession: [], getSession: 0 };
  const auth = {
    async exchangeCodeForSession(code) {
      calls.exchange.push(code);
      if (!exchangeError) session = expectedSession;
      return { error: exchangeError };
    },
    async setSession(tokens) {
      calls.setSession.push(tokens);
      if (!setError) session = expectedSession;
      return { error: setError };
    },
    async getSession() {
      calls.getSession += 1;
      return { data: { session }, error: getError };
    },
  };
  return { client: { auth }, calls };
}

// Implicit recovery tokens must be exchanged with setSession before getSession.
{
  const { client, calls } = mockAuth();
  const result = await establishRecoverySession(
    client,
    "https://example.test/BETHAG/reset-password.html#access_token=access123&refresh_token=refresh456&type=recovery"
  );
  assert.equal(result.error, null);
  assert.equal(result.flow, "implicit");
  assert.deepEqual(result.session, expectedSession);
  assert.deepEqual(calls.setSession, [{ access_token: "access123", refresh_token: "refresh456" }]);
  assert.equal(calls.getSession, 1);
}

// PKCE links exchange the code, then read the resulting session.
{
  const { client, calls } = mockAuth();
  const result = await establishRecoverySession(client, "https://example.test/BETHAG/reset-password.html?code=pkce-code");
  assert.equal(result.error, null);
  assert.equal(result.flow, "pkce");
  assert.deepEqual(result.session, expectedSession);
  assert.deepEqual(calls.exchange, ["pkce-code"]);
  assert.equal(calls.setSession.length, 0);
  assert.equal(calls.getSession, 1);
}

// A partial implicit token pair must fail closed without reading an unrelated session.
{
  const { client, calls } = mockAuth({ session: expectedSession });
  const result = await establishRecoverySession(client, "https://example.test/reset-password/#access_token=only-access");
  assert.equal(result.flow, "implicit");
  assert.ok(result.error instanceof Error);
  assert.equal(result.session, null);
  assert.equal(calls.getSession, 0);
  assert.equal(calls.setSession.length, 0);
}

// Failed code exchange must not proceed to an unrelated session.
{
  const exchangeError = new Error("expired recovery code");
  const { client, calls } = mockAuth({ session: expectedSession, exchangeError });
  const result = await establishRecoverySession(client, "https://example.test/reset-password/?code=expired");
  assert.equal(result.error, exchangeError);
  assert.equal(result.session, null);
  assert.equal(calls.getSession, 0);
}

// Failed implicit-token exchange must not continue.
{
  const setError = new Error("invalid token pair");
  const { client, calls } = mockAuth({ session: expectedSession, setError });
  const result = await establishRecoverySession(client, "https://example.test/reset-password/#access_token=a&refresh_token=b");
  assert.equal(result.error, setError);
  assert.equal(result.session, null);
  assert.equal(calls.getSession, 0);
}

// Existing session remains supported for an already authenticated password update.
{
  const { client, calls } = mockAuth({ session: expectedSession });
  const result = await establishRecoverySession(client, "https://example.test/BETHAG/reset-password.html");
  assert.equal(result.error, null);
  assert.equal(result.flow, "existing");
  assert.deepEqual(result.session, expectedSession);
  assert.equal(calls.getSession, 1);
}

// Both deployed HTML entry points must use the tested recovery-session helper.
{
  const root = await readFile(new URL("../reset-password.html", import.meta.url), "utf8");
  const publicPage = await readFile(new URL("../public/reset-password/index.html", import.meta.url), "utf8");
  assert.match(root, /establishRecoverySession\s*\}\s*from\s*["']\.\/reset-password\/recovery-session\.js["']/);
  assert.match(publicPage, /establishRecoverySession\s*\}\s*from\s*["']\.\/recovery-session\.js["']/);
  assert.match(root, /establishRecoverySession\(supabase,\s*location\.href\)/);
  assert.match(publicPage, /establishRecoverySession\(supabase,\s*location\.href\)/);
}

console.log("PASS password recovery session runtime: implicit tokens, PKCE, partial-token fail-closed, exchange errors, existing session, and both HTML entry points wired.");
