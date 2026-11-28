import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/main.tsx", "utf8");
const start = source.indexOf("function SecuritySettingsCard()");
const end = source.indexOf("\nfunction ", start + 20);
const component = source.slice(start, end);
assert.ok(component.includes("const securityRequestRef = useRef(0);"), "security refresh tracks request generations");
assert.ok(component.includes("if (settingsError) throw settingsError;"), "settings read errors are not silently interpreted as disabled");
assert.ok(component.includes("if (factorsError) throw factorsError;"), "MFA list errors are not silently interpreted as disabled");
assert.ok(component.includes("if (requestId !== securityRequestRef.current) return;"), "stale security refresh results are ignored");
assert.ok(component.includes("if (requestId === securityRequestRef.current) setSecurityError"), "current refresh errors are visible");
assert.ok(component.includes("if (requestId === securityRequestRef.current) setSecurityLoading(false);"), "only current request clears loading");
assert.ok(component.includes("Verifica delle impostazioni di sicurezza in corso"), "security state has an explicit loading label");
assert.ok(component.includes("Impossibile verificare lo stato delle protezioni"), "security read failure has a visible retry path");
assert.ok(component.includes("const securityVerified = !securityLoading && !securityError;"), "protection state is considered authoritative only after a successful refresh");
assert.ok(component.includes("{securityVerified && ("), "protection labels and controls are hidden while status is unknown");
const verifiedGridStart = component.indexOf("{securityVerified && (");
const verifiedGridEnd = component.indexOf("    )}", verifiedGridStart);
assert.ok(verifiedGridStart >= 0 && verifiedGridEnd > verifiedGridStart, "verified-only protection UI has a complete conditional boundary");
const verifiedGrid = component.slice(verifiedGridStart, verifiedGridEnd);
assert.ok(verifiedGrid.includes("Disattivato:") && verifiedGrid.includes("Disattivata:"), "disabled labels are rendered only inside the verified state");
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
console.log("Security settings load-error regression checks passed");
