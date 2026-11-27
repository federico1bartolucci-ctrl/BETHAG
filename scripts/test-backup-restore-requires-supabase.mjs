import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getBackupRestoreBackendAvailability } from "../src/lib/backupRestoreBackendAvailability.mjs";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

const restoreStart = source.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = source.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace restore handler must exist");
const handler = source.slice(restoreStart, restoreEnd);

const availabilityGuard = handler.indexOf("getBackupRestoreBackendAvailability(");
const firstConfirmation = handler.indexOf("window.confirm(");
const firstFrontendMutation = handler.indexOf('apply("condominiums"');
const firstLocalStorageWrite = handler.indexOf("localStorage.setItem(");
const firstBackendWrite = handler.indexOf("supabase.from(table)");
assert.ok(availabilityGuard >= 0, "restore handler must call the Supabase availability guard");
assert.ok(firstConfirmation > availabilityGuard, "availability guard must run before user confirmation");
assert.ok(firstFrontendMutation > availabilityGuard, "availability guard must run before React state mutation");
assert.ok(firstLocalStorageWrite > availabilityGuard, "availability guard must run before localStorage mutation");
assert.ok(firstBackendWrite > availabilityGuard, "availability guard must run before backend writes");
assert.match(handler, /if \(backendAvailability\.blockReason\)\s*\{\s*alert\(backendAvailability\.blockReason\);\s*return;/);
assert.match(handler, /else if \(backendAvailability\.localOnlyNotice\)/,
  "a valid local-only restore must not be reported as a complete backend restore");
assert.ok(packageJson.scripts.test.includes("test-backup-restore-requires-supabase.mjs"),
  "runtime regression must be wired into npm test");

const restorableTables = ["condominiums", "documents", "communications", "communication_recipients"];
const backupWithBackendRows = {
  backend: {
    condominiums: [{ id: "condominium-1" }],
    documents: [{ id: "document-1" }],
    communications: [],
    communication_recipients: [],
  },
};

// Reproduce the legacy branch: when Supabase is null, the old conditional
// skips every backend write while the old final branch still reports success.
const legacyBackendWrites = null
  ? backupWithBackendRows.backend.condominiums.length
  : 0;
const legacyFinalMessage = "Ripristino BETHAG completato.";
assert.equal(legacyBackendWrites, 0);
assert.match(legacyFinalMessage, /completato/i);

const unavailable = getBackupRestoreBackendAvailability(
  backupWithBackendRows,
  false,
  restorableTables
);
assert.match(unavailable.blockReason, /Supabase non è configurato/i);
assert.match(unavailable.blockReason, /condominiums, documents/i);
assert.equal(unavailable.localOnlyNotice, "");
assert.deepEqual(unavailable.tables, ["condominiums", "documents"]);

const configured = getBackupRestoreBackendAvailability(
  backupWithBackendRows,
  true,
  restorableTables
);
assert.equal(configured.blockReason, "");
assert.equal(configured.localOnlyNotice, "");
assert.deepEqual(configured.tables, ["condominiums", "documents"]);

const localOnly = getBackupRestoreBackendAvailability(
  {
    backend: {
      condominiums: [],
      communications: [],
      workspace_members: [{ user_id: "not-restored-from-backup" }],
    },
  },
  false,
  restorableTables
);
assert.equal(localOnly.blockReason, "");
assert.match(localOnly.localOnlyNotice, /soltanto lo stato locale/i);
assert.deepEqual(localOnly.tables, []);

const malformedBackendPayload = getBackupRestoreBackendAvailability(
  { backend: { communications: { id: "not-an-array" } } },
  false,
  restorableTables
);
assert.match(malformedBackendPayload.blockReason, /communications/i);

// Reproduce the gap in the previous helper: with Supabase configured, the
// restore loop converted this malformed table payload to [] and skipped it,
// while the frontend snapshot could still be committed.
const malformedConfiguredBackendPayload = getBackupRestoreBackendAvailability(
  { backend: { communications: { id: "not-an-array" } } },
  true,
  restorableTables
);
assert.match(malformedConfiguredBackendPayload.blockReason, /payload non validi/i);
assert.deepEqual(malformedConfiguredBackendPayload.tables, ["communications"]);

const malformedBackendRoots = [
  ["missing backend section", {}],
  ["null backend section", { backend: null }],
  ["string backend section", { backend: "invalid" }],
  ["array backend section", { backend: [] }],
  ["number backend section", { backend: 42 }],
];
for (const [label, malformedBackup] of malformedBackendRoots) {
  for (const supabaseAvailable of [false, true]) {
    const result = getBackupRestoreBackendAvailability(
      malformedBackup,
      supabaseAvailable,
      restorableTables
    );
    assert.match(result.blockReason, /sezione backend.*assente o non valida/i,
      `${label} must block regardless of Supabase availability`);
    assert.equal(result.localOnlyNotice, "");
    assert.deepEqual(result.tables, ["backend"]);
  }
}

const emptyBackup = getBackupRestoreBackendAvailability(
  { backend: { condominiums: [], communications: [] } },
  false,
  restorableTables
);
assert.equal(emptyBackup.blockReason, "");
assert.match(emptyBackup.localOnlyNotice, /non erano presenti record backend ripristinabili/i);

console.log("Workspace backup restore Supabase-availability runtime regression: PASS");
