import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const loginStart = source.indexOf("const handleLogin = async");
const loginEnd = source.indexOf("const normalizedEmail = email.trim();", loginStart);
assert.ok(loginStart >= 0 && loginEnd > loginStart, "handleLogin must exist");
const login = source.slice(loginStart, loginEnd);
assert.match(login, /let mfaChosenForLogin = false;/, "MFA opt-in state must be tracked");
assert.match(login, /if \(mfaChosenForLogin\)\s*\{\s*await supabase\.auth\.signOut\(\);\s*throw new Error/, "chosen MFA failures must sign out and abort login");
assert.match(login, /if \(!code\?\.trim\(\)\)\s*\{\s*throw new Error\("Verifica a due fattori annullata/, "empty or cancelled MFA code must abort login");
assert.match(login, /if \(verifyError\)\s*\{\s*throw new Error\("Codice di autenticazione a due fattori non valido\."/);
console.log("MFA opt-in failure regression checks passed.");
