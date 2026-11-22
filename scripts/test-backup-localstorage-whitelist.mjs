import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { restoreBackupLocalStorageData } from "../src/lib/backupLocalStorageRestore.mjs";

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

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(mainSource, /restoreBackupLocalStorageData\s*\(/);
assert.match(mainSource, /Object\.values\(KEYS\)\.filter\s*\(/);
assert.match(mainSource, /new Set\(\[KEYS\.session, KEYS\.sessionEmail\]\)/);
assert.match(mainSource, /backup\.localStorageData/);
assert.match(packageJson.scripts.test, /test-backup-localstorage-whitelist\.mjs/);

console.log("Backup localStorage whitelist runtime regression: PASS");
