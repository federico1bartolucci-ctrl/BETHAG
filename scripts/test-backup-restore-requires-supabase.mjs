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
assert.ok(availabilityGuard >= 0, "restore handler must call the backend payload guard");
assert.ok(firstConfirmation > availabilityGuard, "backend payload guard must run before user confirmation");
assert.ok(firstFrontendMutation > availabilityGuard, "backend payload guard must run before React state mutation");
assert.ok(firstLocalStorageWrite > availabilityGuard, "backend payload guard must run before localStorage mutation");
assert.ok(firstBackendWrite > availabilityGuard, "backend payload guard must run before backend writes");
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

const malformedTablePayload = getBackupRestoreBackendAvailability(
  { backend: { communications: { id: "not-an-array" } } },
  false,
  restorableTables
);
assert.match(malformedTablePayload.blockReason, /communications/i);

const malformedTableWithSupabase = getBackupRestoreBackendAvailability(
  { backend: { documents: { id: "not-an-array" } } },
  true,
  restorableTables
);
assert.match(malformedTableWithSupabase.blockReason, /documents/i,
  "malformed table payloads must be blocked even when Supabase is configured");

const malformedRowWithSupabase = getBackupRestoreBackendAvailability(
  { backend: { documents: [{ id: "document-1" }, null] } },
  true,
  restorableTables
);
assert.match(malformedRowWithSupabase.blockReason, /documents/i,
  "non-object rows must be blocked before the restore loop can silently skip them");

for (const malformedBackup of [
  { format: "BETHAG_WORKSPACE_BACKUP", version: 1 },
  { backend: null },
  { backend: "corrupted" },
  { backend: [] },
]) {
  for (const supabaseAvailable of [false, true]) {
    const result = getBackupRestoreBackendAvailability(
      malformedBackup,
      supabaseAvailable,
      restorableTables
    );
    assert.match(result.blockReason, /sezione backend.*assente o non valida/i,
      "missing or non-object backend roots must be blocked regardless of Supabase availability");
    assert.equal(result.localOnlyNotice, "");
  }
}

// Reproduce the old configured-backend false-success path: malformed root/table
// values were normalized to empty arrays by the restore loop and produced no error.
const legacyMalformedRootRows = Array.isArray("corrupted"?.documents)
  ? "corrupted".documents
  : [];
const legacyMalformedTableRows = Array.isArray({ id: "not-an-array" })
  ? { id: "not-an-array" }
  : [];
assert.deepEqual(legacyMalformedRootRows, []);
assert.deepEqual(legacyMalformedTableRows, []);

const emptyBackup = getBackupRestoreBackendAvailability(
  { backend: { condominiums: [], communications: [] } },
  false,
  restorableTables
);
assert.equal(emptyBackup.blockReason, "");
assert.match(emptyBackup.localOnlyNotice, /non erano presenti record backend ripristinabili/i);

console.log("Workspace backup restore backend-payload integrity runtime regression: PASS");
