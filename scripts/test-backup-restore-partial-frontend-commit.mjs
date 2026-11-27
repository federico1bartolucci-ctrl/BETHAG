import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commitBackupFrontendStateAfterBackendRestore, getRestorableBackupSourceReadErrors } from "../src/lib/backupRestoreFrontendCommit.mjs";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const restoreStart = source.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = source.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace restore handler must exist");
const handler = source.slice(restoreStart, restoreEnd);

const backendLoop = handler.indexOf("const restoreOrder = WORKSPACE_BACKUP_RESTORE_ORDER;");
const sourceReadGate = handler.indexOf("getRestorableBackupSourceReadErrors(");
const frontendCommit = handler.indexOf("commitBackupFrontendStateAfterBackendRestore(errors, () => {");
const firstFrontendMutation = handler.indexOf('apply("condominiums", setCondominiums)');
const firstLocalStorageWrite = handler.indexOf("localStorage.setItem(");
assert.ok(backendLoop >= 0, "backend restore loop must exist");
assert.ok(sourceReadGate > backendLoop && sourceReadGate < frontendCommit,
  "restorable source-read errors must be collected after backend restore and before frontend commit");
assert.match(handler, /WORKSPACE_BACKUP_RESTORE_ORDER\.filter\(\(table\) => !isBackupAuthorizationTable\(table\)\)/,
  "only tables that the restore handler actually restores must gate frontend commit");
assert.match(handler, /\}, restorableSourceReadErrors\);/,
  "source-read failures must be passed to the frontend commit gate");
assert.ok(frontendCommit > backendLoop, "frontend snapshot commit must occur after backend restore loop");
assert.ok(firstFrontendMutation > frontendCommit, "React state must be applied only inside the deferred commit");
assert.ok(firstLocalStorageWrite > frontendCommit, "localStorage must be written only inside the deferred commit");
assert.match(handler, /frontendCommitNotice/);
assert.match(handler, /if \(errors\.length \|\| sourceReadErrorSummary \|\| !frontendCommit\.committed\)/,
  "an incomplete source gate must route through the partial-restore alert even when the error summary is malformed");
assert.match(handler, /database può contenere scritture parziali/i);
assert.match(handler, /backup sorgente contiene errori di lettura nelle tabelle ripristinabili/i);
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
  failedSourceReads: 0,
  reason: "backend_restore_incomplete",
});
assert.equal(backendRows.get("condominiums")[0].name, "Restored",
  "the test must retain the confirmed partial backend write");
assert.equal(frontendCommitCalls, 0, "frontend commit must not run after a backend failure");
assert.equal(frontendState.condominiums[0].id, "condo-old",
  "React state must remain unchanged after a partial backend restore");
assert.equal(JSON.parse(storage.get("condominiums"))[0].id, "condo-old",
  "localStorage must remain unchanged after a partial backend restore");

// Reproduce the uncovered source-export failure: backend writes for the rows
// present in the file can succeed even though a restorable table was omitted
// after a failed export page. The full frontend snapshot must not be committed.
const sourceReadFailures = getRestorableBackupSourceReadErrors({
  documents: "timeout while exporting page 2",
  portal_access: "authorization table is intentionally not restored"
}, ["documents", "condominium_members"]);
assert.deepEqual(sourceReadFailures, ["documents: timeout while exporting page 2"]);
let sourceCommitCalls = 0;
const incompleteSource = commitBackupFrontendStateAfterBackendRestore(
  [],
  () => { sourceCommitCalls += 1; },
  sourceReadFailures
);
assert.deepEqual(incompleteSource, {
  committed: false,
  failedOperations: 0,
  failedSourceReads: 1,
  reason: "source_backup_incomplete"
});
assert.equal(sourceCommitCalls, 0,
  "frontend state must not be committed when a restorable source table failed to export");

// Read failures in authorization/workflow tables are excluded because those
// tables are deliberately not restored from a user-supplied backup.
const excludedOnlySourceErrors = getRestorableBackupSourceReadErrors({
  portal_access: "permission denied",
  portal_registration_requests: "timeout"
}, ["documents", "condominiums"]);
assert.deepEqual(excludedOnlySourceErrors, []);
const excludedOnlyRestore = commitBackupFrontendStateAfterBackendRestore(
  [],
  () => { sourceCommitCalls += 1; },
  excludedOnlySourceErrors
);
assert.equal(excludedOnlyRestore.committed, true);
assert.equal(sourceCommitCalls, 1);

// Missing error metadata remains compatible with legacy backups, while a
// present malformed section fails closed.
assert.deepEqual(getRestorableBackupSourceReadErrors(undefined, ["documents"]), []);
assert.deepEqual(getRestorableBackupSourceReadErrors(null, ["documents"]), []);
// A malformed value on a restorable table must fail closed. In particular,
// JSON.stringify preserves [] as a valid JSON value, while String([]) is empty;
// the previous filter silently discarded it and allowed frontend commit.
const malformedEntryVariants = [
  ["empty array", JSON.parse(JSON.stringify({ documents: [] }))],
  ["null", { documents: null }],
  ["empty string", { documents: "" }],
  ["whitespace string", { documents: " " }],
  ["object", { documents: {} }],
  ["number", { documents: 0 }],
  ["boolean", { documents: false }],
];
for (const [label, metadata] of malformedEntryVariants) {
  const malformedErrors = getRestorableBackupSourceReadErrors(metadata, ["documents"]);
  assert.deepEqual(malformedErrors, ["documents: formato errore non valido"],
    `malformed restorable-table metadata (${label}) must fail closed`);
  let malformedCommitCalls = 0;
  const malformedRestore = commitBackupFrontendStateAfterBackendRestore(
    [],
    () => { malformedCommitCalls += 1; },
    malformedErrors
  );
  assert.equal(malformedRestore.committed, false,
    `malformed restorable-table metadata (${label}) must block frontend commit`);
  assert.equal(malformedRestore.reason, "source_backup_incomplete");
  assert.equal(malformedCommitCalls, 0);
}
assert.deepEqual(
  getRestorableBackupSourceReadErrors({ portal_access: [] }, ["documents"]),
  [],
  "malformed entries for intentionally excluded authorization tables must not block restore"
);
assert.deepEqual(getRestorableBackupSourceReadErrors("malformed", ["documents"]),
  ["backendReadErrors: formato non valido"]);
assert.throws(
  () => getRestorableBackupSourceReadErrors({ documents: "timeout" }, null),
  /restorableTables must be an array/
);

// A fully successful backend restore may commit the frontend snapshot.
const complete = commitBackupFrontendStateAfterBackendRestore([], () => {
  frontendCommitCalls += 1;
  frontendState = { condominiums: [{ id: "condo-1", name: "Restored" }] };
  storage.set("condominiums", JSON.stringify(frontendState.condominiums));
});
assert.deepEqual(complete, {
  committed: true,
  failedOperations: 0,
  failedSourceReads: 0,
  reason: "backend_restore_complete",
});
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
assert.throws(
  () => commitBackupFrontendStateAfterBackendRestore([], () => {}, null),
  /sourceReadErrors must be an array/
);

console.log("Workspace backup partial-backend restore frontend-commit regression: PASS");
