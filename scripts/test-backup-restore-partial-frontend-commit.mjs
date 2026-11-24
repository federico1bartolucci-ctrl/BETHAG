import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commitBackupFrontendStateAfterBackendRestore } from "../src/lib/backupRestoreFrontendCommit.mjs";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const restoreStart = source.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = source.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace restore handler must exist");
const handler = source.slice(restoreStart, restoreEnd);

const backendLoop = handler.indexOf("const restoreOrder = WORKSPACE_BACKUP_RESTORE_ORDER;");
const frontendCommit = handler.indexOf("commitBackupFrontendStateAfterBackendRestore(errors, () => {");
const firstFrontendMutation = handler.indexOf('apply("condominiums", setCondominiums)');
const firstLocalStorageWrite = handler.indexOf("localStorage.setItem(");
assert.ok(backendLoop >= 0, "backend restore loop must exist");
assert.ok(frontendCommit > backendLoop, "frontend snapshot commit must occur after backend restore loop");
assert.ok(firstFrontendMutation > frontendCommit, "React state must be applied only inside the deferred commit");
assert.ok(firstLocalStorageWrite > frontendCommit, "localStorage must be written only inside the deferred commit");
assert.match(handler, /frontendCommitNotice/);
assert.match(handler, /database può contenere scritture parziali/i);
assert.ok(packageJson.scripts.test.includes("test-backup-restore-partial-frontend-commit.mjs"),
  "runtime regression must be wired into npm test");

// Reproduce a backend restore that commits one table and then fails on another.
// The backend can be partial, but the full frontend/localStorage snapshot must
// not be committed over the pre-restore local state.
const backendRows = new Map();
const backendErrors = [];
async function writeBackendTable(table, rows) {
  if (table === "documents") return { error: { message: "permission denied" } };
  backendRows.set(table, rows);
  return { error: null };
}
for (const [table, rows] of [
  ["condominiums", [{ id: "condo-1", name: "Restored" }]],
  ["documents", [{ id: "document-1", name: "Not restored" }]],
]) {
  const result = await writeBackendTable(table, rows);
  if (result.error) backendErrors.push(table + ": " + result.error.message);
}
let frontendState = { condominiums: [{ id: "condo-old", name: "Current" }] };
const storage = new Map([["condominiums", JSON.stringify(frontendState.condominiums)]]);
let frontendCommitCalls = 0;

const partial = commitBackupFrontendStateAfterBackendRestore(backendErrors, () => {
  frontendCommitCalls += 1;
  frontendState = { condominiums: [{ id: "condo-1", name: "Restored" }] };
  storage.set("condominiums", JSON.stringify(frontendState.condominiums));
});

assert.deepEqual(partial, {
  committed: false,
  failedOperations: 1,
  reason: "backend_restore_incomplete",
});
assert.equal(backendRows.get("condominiums")[0].name, "Restored",
  "the test must retain the confirmed partial backend write");
assert.equal(frontendCommitCalls, 0, "frontend commit must not run after a backend failure");
assert.equal(frontendState.condominiums[0].id, "condo-old",
  "React state must remain unchanged after a partial backend restore");
assert.equal(JSON.parse(storage.get("condominiums"))[0].id, "condo-old",
  "localStorage must remain unchanged after a partial backend restore");

// A fully successful backend restore may commit the frontend snapshot.
const complete = commitBackupFrontendStateAfterBackendRestore([], () => {
  frontendCommitCalls += 1;
  frontendState = { condominiums: [{ id: "condo-1", name: "Restored" }] };
  storage.set("condominiums", JSON.stringify(frontendState.condominiums));
});
assert.equal(complete.committed, true);
assert.equal(frontendCommitCalls, 1);
assert.equal(frontendState.condominiums[0].id, "condo-1");
assert.equal(JSON.parse(storage.get("condominiums"))[0].id, "condo-1");

// The local-only path remains valid when no backend rows are restorable.
const localOnly = commitBackupFrontendStateAfterBackendRestore([], () => {
  frontendCommitCalls += 1;
});
assert.equal(localOnly.committed, true);
assert.equal(frontendCommitCalls, 2);

assert.throws(
  () => commitBackupFrontendStateAfterBackendRestore(null, () => {}),
  /backendErrors must be an array/
);

console.log("Workspace backup partial-backend restore frontend-commit regression: PASS");
