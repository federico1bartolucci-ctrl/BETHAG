import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { restoreBackupLocalStorageData } from "../src/lib/backupLocalStorageRestore.mjs";
import { commitBackupFrontendStateAfterBackendRestore } from "../src/lib/backupRestoreFrontendCommit.mjs";

const values = new Map();
const storage = {
  setItem(key, value) {
    if (key === "bethag-current-page-v1") throw new Error("simulated storage quota failure");
    values.set(key, value);
  },
};
const allowedKeys = [
  "bethag-condominiums-v5",
  "bethag-profile-v5",
  "bethag-current-page-v1",
];
const backupLocalStorageData = {
  "bethag-condominiums-v5": [{ id: 7, name: "Condominio" }],
  "bethag-profile-v5": "safe-profile",
  "bethag-current-page-v1": "registro",
  "bethag-session-v1": "injected-session",
  "bethag-session-email-v1": "injected-email",
  "sb-project-auth-token": "injected-supabase-token",
  "unexpected-storage-key": "unexpected-value",
};

const result = restoreBackupLocalStorageData(backupLocalStorageData, allowedKeys, storage);
assert.deepEqual(result, { restored: 2, skipped: 4, failed: 1 });
assert.deepEqual(JSON.parse(values.get("bethag-condominiums-v5")), [{ id: 7, name: "Condominio" }]);
assert.equal(values.get("bethag-profile-v5"), "safe-profile");
assert.equal(values.has("bethag-current-page-v1"), false);
assert.equal(values.has("bethag-session-v1"), false);
assert.equal(values.has("bethag-session-email-v1"), false);
assert.equal(values.has("sb-project-auth-token"), false);
assert.equal(values.has("unexpected-storage-key"), false);
assert.deepEqual(restoreBackupLocalStorageData(null, allowedKeys, storage), { restored: 0, skipped: 0, failed: 0 });
assert.deepEqual(restoreBackupLocalStorageData([], allowedKeys, storage), { restored: 0, skipped: 0, failed: 0 });

// The production restore must not report success when one allowed localStorage
// key fails. Successful writes from the same transaction are rolled back.
const transactionalValues = new Map([
  ["bethag-condominiums-v5", "old-condominiums"],
  ["bethag-profile-v5", "old-profile"],
  ["bethag-current-page-v1", "old-page"],
]);
const transactionalStorage = {
  getItem(key) {
    return transactionalValues.has(key) ? transactionalValues.get(key) : null;
  },
  setItem(key, value) {
    if (key === "bethag-current-page-v1") throw new Error("simulated quota failure");
    transactionalValues.set(key, value);
  },
  removeItem(key) {
    transactionalValues.delete(key);
  },
};
const transactionalResult = restoreBackupLocalStorageData(
  backupLocalStorageData,
  allowedKeys,
  transactionalStorage,
  { rollbackOnFailure: true }
);
assert.deepEqual(transactionalResult, {
  restored: 0,
  skipped: 4,
  failed: 1,
  rollbackFailed: 0,
  rolledBack: 2,
});
assert.equal(transactionalValues.get("bethag-condominiums-v5"), "old-condominiums");
assert.equal(transactionalValues.get("bethag-profile-v5"), "old-profile");
assert.equal(transactionalValues.get("bethag-current-page-v1"), "old-page");

const failedCommit = commitBackupFrontendStateAfterBackendRestore(
  [],
  () => ({
    failedLocalStorageWrites: transactionalResult.failed,
    rollbackFailed: transactionalResult.rollbackFailed,
  })
);
assert.deepEqual(failedCommit, {
  committed: false,
  failedOperations: 0,
  failedSourceReads: 0,
  failedLocalStorageWrites: 1,
  rollbackFailed: 0,
  reason: "frontend_local_storage_incomplete",
});

// If rollback itself fails, the caller must not automatically reload into a
// potentially mixed localStorage snapshot.
const rollbackFailureValues = new Map([["key-a", "old-a"]]);
const rollbackFailureStorage = {
  getItem(key) {
    return rollbackFailureValues.has(key) ? rollbackFailureValues.get(key) : null;
  },
  setItem(key, value) {
    if (key === "key-b") throw new Error("simulated quota failure");
    if (key === "key-a" && value === "old-a") throw new Error("simulated rollback failure");
    rollbackFailureValues.set(key, value);
  },
  removeItem(key) {
    rollbackFailureValues.delete(key);
  },
};
const rollbackFailureResult = restoreBackupLocalStorageData(
  { "key-a": "new-a", "key-b": "new-b" },
  ["key-a", "key-b"],
  rollbackFailureStorage,
  { rollbackOnFailure: true }
);
assert.deepEqual(rollbackFailureResult, {
  restored: 0,
  skipped: 0,
  failed: 1,
  rollbackFailed: 1,
  rolledBack: 0,
});
assert.equal(rollbackFailureValues.get("key-a"), "new-a");

const rollbackFailureCommit = commitBackupFrontendStateAfterBackendRestore(
  [],
  () => ({
    failedLocalStorageWrites: rollbackFailureResult.failed,
    rollbackFailed: rollbackFailureResult.rollbackFailed,
  })
);
assert.equal(rollbackFailureCommit.committed, false);
assert.equal(rollbackFailureCommit.reason, "frontend_local_storage_incomplete");
assert.equal(rollbackFailureCommit.rollbackFailed, 1);


const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(mainSource, /restoreBackupLocalStorageData\\s*\\(/);
assert.match(mainSource, /Object\\.values\\(KEYS\\)\\.filter\\s*\\(/);
assert.match(mainSource, /new Set\\(\\[KEYS\\.session, KEYS\\.sessionEmail\\]\\)/);
assert.match(mainSource, /backup\\.localStorageData/);
assert.match(mainSource, /rollbackOnFailure:\\s*true/);
assert.match(mainSource, /failedLocalStorageWrites/);
assert.match(mainSource, /frontend_local_storage_incomplete/);
const restoreStart = mainSource.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = mainSource.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
const restoreHandler = mainSource.slice(restoreStart, restoreEnd);
const localStorageRestoreCall = restoreHandler.indexOf("restoreBackupLocalStorageData(");
const firstReactApply = restoreHandler.indexOf('apply("condominiums"');
assert.ok(localStorageRestoreCall >= 0 && firstReactApply > localStorageRestoreCall,
  "localStorage must be restored successfully before the React snapshot is applied");
assert.ok(restoreHandler.includes('if (frontendCommit.reason === "frontend_local_storage_incomplete" && frontendCommit.rollbackFailed > 0) return;'),
  "do not reload automatically when localStorage rollback failed");

console.log("Backup localStorage whitelist runtime regression: PASS");
