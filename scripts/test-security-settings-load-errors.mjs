import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readVerifiedSecuritySettings } from "../src/lib/securitySettingsRead.mjs";

function fakeClient({
  user = { id: "user-1" },
  userError = null,
  settings = { personal_code_enabled: true },
  settingsError = null,
  factors = {
    totp: [{ id: "totp-verified", status: "verified" }, { id: "totp-unverified", status: "unverified" }],
    phone: [{ id: "phone-verified", status: "verified" }],
  },
  factorsError = null,
} = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: userError }),
      mfa: { listFactors: async () => { calls.push(["listFactors"]); return { data: factors, error: factorsError }; } },
    },
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return { maybeSingle: async () => { calls.push(["maybeSingle"]); return { data: settings, error: settingsError }; } };
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

const valid = fakeClient();
assert.deepEqual(await readVerifiedSecuritySettings(valid.client), {
  codeEnabled: true,
  mfaFactors: [{ id: "totp-verified", status: "verified" }, { id: "phone-verified", status: "verified" }],
});
assert.deepEqual(valid.calls, [
  ["from", "user_security_settings"],
  ["select", "personal_code_enabled"],
  ["eq", "user_id", "user-1"],
  ["maybeSingle"],
  ["listFactors"],
], "security reads must be scoped to the authenticated user and read MFA only after settings succeed");

const noSettings = fakeClient({ settings: null });
assert.deepEqual(await readVerifiedSecuritySettings(noSettings.client), {
  codeEnabled: false,
  mfaFactors: [{ id: "totp-verified", status: "verified" }, { id: "phone-verified", status: "verified" }],
}, "a successful SELECT with no settings row represents the disabled default");

const authFailure = fakeClient({ userError: new Error("auth read failed") });
await assert.rejects(readVerifiedSecuritySettings(authFailure.client), /auth read failed/);
assert.equal(authFailure.calls.length, 0, "settings and MFA must not be queried after an auth error");

const missingUser = fakeClient({ user: null });
await assert.rejects(readVerifiedSecuritySettings(missingUser.client), /Sessione utente non disponibile/);
assert.equal(missingUser.calls.length, 0, "missing user must not be interpreted as disabled protections");

const settingsFailure = fakeClient({ settingsError: new Error("settings read failed") });
await assert.rejects(readVerifiedSecuritySettings(settingsFailure.client), /settings read failed/);
assert.equal(settingsFailure.calls.some((call) => call[0] === "listFactors"), false, "MFA must not be queried after settings read failure");

const malformedSettings = fakeClient({ settings: { personal_code_enabled: "false" } });
await assert.rejects(readVerifiedSecuritySettings(malformedSettings.client), /impostazioni di sicurezza non valida/);

const factorsFailure = fakeClient({ factorsError: new Error("MFA read failed") });
await assert.rejects(readVerifiedSecuritySettings(factorsFailure.client), /MFA read failed/);

const malformedFactors = fakeClient({ factors: { totp: null, phone: [] } });
await assert.rejects(readVerifiedSecuritySettings(malformedFactors.client), /Risposta MFA non valida/);

await assert.rejects(readVerifiedSecuritySettings(null), /Supabase non configurato/);

const source = await readFile("src/main.tsx", "utf8");
const start = source.indexOf("function SecuritySettingsCard()");
const end = source.indexOf("\nfunction ", start + 20);
const component = source.slice(start, end);
assert.ok(source.includes('import { readVerifiedSecuritySettings } from "./lib/securitySettingsRead.mjs";'));
assert.ok(component.includes("await readVerifiedSecuritySettings(supabase)"), "active security card must use the runtime-verified reader");
assert.ok(component.includes("if (requestId !== securityRequestRef.current) return;"), "stale refresh results must be ignored");
assert.ok(component.includes("const securityVerified = !securityLoading && !securityError;"), "status is authoritative only after a successful refresh");
assert.ok(component.includes("{securityVerified && ("), "disabled labels must remain hidden while status is unknown");
assert.ok(component.includes("Impossibile verificare lo stato delle protezioni"), "read errors must have an explicit retry state");
assert.ok(component.includes("return () => { securityRequestRef.current += 1; };"), "unmount must invalidate pending refreshes");
assert.ok(component.includes("change_personal_security_code"), "the current secure personal-code disable RPC must be preserved");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const testCommand = packageJson.scripts.test;
for (const required of [
  "test-clean-bootstrap.mjs",
  "test-ledger-edit-allocation-guard.mjs",
  "test-storage-restore-resume.mjs",
  "test-fiscal-year-save-runtime.mjs",
]) {
  assert.ok(testCommand.includes(required), "existing main test chain must retain " + required);
}
assert.ok(testCommand.endsWith("node scripts/test-security-settings-load-errors.mjs"), "security regression must be appended after the existing main test chain");
assert.equal((testCommand.match(/test-security-settings-load-errors\.mjs/g)||[]).length, 1, "security regression must be registered exactly once in npm test");

console.log("Security settings read-error runtime regression: PASS");
