import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createAuthSessionRevision } from "../src/lib/auth-session-revision.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

const revisions = createAuthSessionRevision();
const ui = { role: null, email: "" };

// A sign-in lookup starts, then SIGNED_OUT arrives before the lookup resolves.
const pendingSignInRevision = revisions.begin();
const pendingAccess = deferred();
const pendingSignIn = (async () => {
  const access = await pendingAccess.promise;
  if (!revisions.isCurrent(pendingSignInRevision)) return;
  ui.role = access.role;
  ui.email = access.email;
})();
const signedOutRevision = revisions.begin();
assert.equal(revisions.isCurrent(pendingSignInRevision), false);
assert.equal(revisions.isCurrent(signedOutRevision), true);
ui.role = null;
ui.email = "";
pendingAccess.resolve({ role: "admin", email: "stale@example.test" });
await pendingSignIn;
assert.deepEqual(ui, { role: null, email: "" }, "late sign-in hydration must not resurrect signed-out UI");

// A later account switch must win over an earlier account's pending membership lookup.
const accountARevision = revisions.begin();
const accountAAccess = deferred();
const accountAApply = (async () => {
  const access = await accountAAccess.promise;
  if (!revisions.isCurrent(accountARevision)) return;
  ui.role = access.role;
  ui.email = access.email;
})();
const accountBRevision = revisions.begin();
assert.equal(revisions.isCurrent(accountARevision), false);
ui.role = "resident";
ui.email = "b@example.test";
accountAAccess.resolve({ role: "admin", email: "a@example.test" });
await accountAApply;
assert.deepEqual(ui, { role: "resident", email: "b@example.test" }, "late account A lookup must not overwrite account B");

// Initialization must become stale when a real auth event arrives.
const initializationRevision = revisions.begin();
const eventRevision = revisions.begin();
assert.equal(revisions.isCurrent(initializationRevision), false);
assert.equal(revisions.isCurrent(eventRevision), true);

// A stale failure must not clear a newer authenticated state.
const staleFailureRevision = revisions.begin();
const currentSessionRevision = revisions.begin();
ui.role = "collaborator";
ui.email = "current@example.test";
if (revisions.isCurrent(staleFailureRevision)) {
  ui.role = null;
  ui.email = "";
}
assert.equal(revisions.isCurrent(currentSessionRevision), true);
assert.deepEqual(ui, { role: "collaborator", email: "current@example.test" });

const source = await readFile("src/main.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const authStart = source.indexOf("const applySupabaseSession = async");
const authEnd = source.indexOf("/* =======================================================\n     VALIDAZIONE SESSIONE BETHAG", authStart);
assert.ok(authStart >= 0 && authEnd > authStart, "auth session hydration effect exists");
const authBlock = source.slice(authStart, authEnd);
assert.match(source, /import \{ createAuthSessionRevision \} from "\.\/lib\/auth-session-revision\.mjs";/);
assert.match(source, /const authSessionRevision = createAuthSessionRevision\(\)/);
assert.match(authBlock, /revision: number/);
assert.match(authBlock, /if \(cancelled \|\| !authSessionRevision\.isCurrent\(revision\)\) return;/);
assert.match(authBlock, /await resolveSupabaseAccess\([\s\S]*?if \(cancelled \|\| !authSessionRevision\.isCurrent\(revision\)\) return;/);
assert.match(authBlock, /if \(cancelled \|\| !authSessionRevision\.isCurrent\(revision\)\) return;\s*console\.error\("BETHAG resident registration completion failed"/);
assert.match(authBlock, /if \(!cancelled && authSessionRevision\.isCurrent\(revision\)\)/);
assert.match(authBlock, /await supabase\.rpc\("complete_portal_registration"[\s\S]*?if \(cancelled \|\| !authSessionRevision\.isCurrent\(revision\)\) return;/);
assert.equal(packageJson.scripts.test.split("test-auth-session-stale-event.mjs").length - 1, 1);

const initStart = source.indexOf("const initializeAuth = async");
const initEnd = source.indexOf("void initializeAuth();", initStart);
const initBlock = source.slice(initStart, initEnd);
assert.match(initBlock, /const revision = authSessionRevision\.begin\(\)/);
assert.match(initBlock, /onAuthStateChange\(\(event, session\)/);
assert.match(initBlock, /event === "INITIAL_SESSION" && !session\?\.user && !authInitializationComplete/);
assert.match(initBlock, /const revision = authSessionRevision\.begin\(\);\s*window\.setTimeout\([\s\S]*?applySupabaseSession\(session, revision\)/);

console.log("Auth session stale-event runtime regression: PASS");
console.log("Late sign-in after sign-out is ignored: PASS");
console.log("Late account A hydration cannot overwrite account B: PASS");
console.log("Stale initialization and stale failures are ignored: PASS");
