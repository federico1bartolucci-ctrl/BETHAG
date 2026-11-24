import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  WORKSPACE_BACKUP_EXPORT_TABLES,
  WORKSPACE_BACKUP_RESTORE_ORDER,
} from "../src/lib/workspaceBackupTables.mjs";
import { prepareCreationIntakesForBackupRestore } from "../src/lib/backupCreationIntakesRestore.mjs";

const table = "condominium_creation_intakes";
const workspaceId = "11111111-1111-4111-8111-111111111111";
const foreignWorkspaceId = "22222222-2222-4222-8222-222222222222";
const condominiumId = "33333333-3333-4333-8333-333333333333";
const foreignCondominiumId = "44444444-4444-4444-8444-444444444444";

function assertOnce(values, label) {
  assert.equal(values.filter((value) => value === table).length, 1, label + " must contain the table exactly once");
}

assertOnce(WORKSPACE_BACKUP_EXPORT_TABLES, "export manifest");
assertOnce(WORKSPACE_BACKUP_RESTORE_ORDER, "restore manifest");
assert.ok(WORKSPACE_BACKUP_RESTORE_ORDER.indexOf("condominiums") >= 0);
assert.ok(WORKSPACE_BACKUP_RESTORE_ORDER.indexOf("condominiums") < WORKSPACE_BACKUP_RESTORE_ORDER.indexOf(table));

const existingRows = [
  {
    id: "existing-intake",
    workspace_id: workspaceId,
    created_by: "destination-creator",
    confirmed_by: "destination-confirmer",
  },
  {
    id: "foreign-existing-intake",
    workspace_id: foreignWorkspaceId,
    created_by: "foreign-user",
    confirmed_by: null,
  },
];

const backupRows = [
  {
    id: "existing-intake",
    workspace_id: workspaceId,
    status: "Confermato",
    created_condominium_id: condominiumId,
    source_documents: [{
      name: "atto.pdf",
      stored: true,
      storagePath: workspaceId + "/1710000000-random-atto.pdf",
    }],
    created_by: "source-creator",
    confirmed_by: "source-confirmer",
  },
  {
    id: "new-intake",
    workspace_id: workspaceId,
    status: "Da verificare",
    created_condominium_id: null,
    source_documents: [
      { name: "analisi.pdf", stored: false, storagePath: null },
      "legacy-filename.pdf",
    ],
    created_by: "source-creator",
    confirmed_by: null,
  },
  {
    id: "foreign-condominium-intake",
    workspace_id: workspaceId,
    created_condominium_id: foreignCondominiumId,
    source_documents: [],
  },
  {
    id: "foreign-storage-intake",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: [{ name: "foreign.pdf", stored: true, storagePath: foreignWorkspaceId + "/foreign.pdf" }],
  },
  {
    id: "traversal-storage-intake",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: [{ name: "escape.pdf", stored: true, storagePath: workspaceId + "/../other-workspace/escape.pdf" }],
  },
  {
    id: "backslash-storage-intake",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: [{ name: "escape.pdf", stored: true, storagePath: workspaceId + String.fromCharCode(92) + ".." + String.fromCharCode(92) + "other-workspace" + String.fromCharCode(92) + "escape.pdf" }],
  },
  {
    id: "missing-stored-path-intake",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: [{ name: "missing.pdf", stored: true, storagePath: null }],
  },
  {
    id: "foreign-existing-intake",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: [],
  },
  {
    id: "new-intake",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: [],
  },
  {
    id: "wrong-workspace-intake",
    workspace_id: foreignWorkspaceId,
    created_condominium_id: null,
    source_documents: [],
  },
  {
    id: "malformed-source-documents",
    workspace_id: workspaceId,
    created_condominium_id: null,
    source_documents: { storagePath: workspaceId + "/not-an-array.pdf" },
  },
  null,
];

const prepared = prepareCreationIntakesForBackupRestore(
  backupRows,
  workspaceId,
  existingRows,
  [condominiumId]
);

assert.equal(prepared.updateRows.length, 1);
assert.equal(prepared.insertRows.length, 1);
assert.equal(prepared.skipped, 10);

const [updated] = prepared.updateRows;
assert.equal(updated.workspace_id, workspaceId);
assert.equal(updated.created_condominium_id, condominiumId);
assert.equal(updated.created_by, "destination-creator", "existing creator attribution must remain destination-owned");
assert.equal(updated.confirmed_by, "destination-confirmer", "existing confirmer attribution must remain destination-owned");
assert.equal(updated.source_documents[0].storagePath, workspaceId + "/1710000000-random-atto.pdf");

const [inserted] = prepared.insertRows;
assert.equal(inserted.workspace_id, workspaceId);
assert.equal(inserted.created_condominium_id, null);
assert.equal(inserted.created_by, null, "backup auth user IDs must not be replayed into another auth context");
assert.equal(inserted.confirmed_by, null, "backup auth user IDs must not be replayed into another auth context");
assert.deepEqual(inserted.source_documents, [
  { name: "analisi.pdf", stored: false, storagePath: null },
  "legacy-filename.pdf",
]);

const missingSourceDocuments = prepareCreationIntakesForBackupRestore(
  [{ id: "legacy-no-documents", workspace_id: workspaceId }],
  workspaceId,
  [],
  []
);
assert.deepEqual(missingSourceDocuments.insertRows[0].source_documents, []);

assert.throws(
  () => prepareCreationIntakesForBackupRestore([], "", [], []),
  /Workspace di ripristino non valido/
);

const [mainSource, backendSource, schemaSource, packageJson] = await Promise.all([
  readFile(new URL("../src/main.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261017000001_bethag_baseline_schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

assert.match(mainSource, /prepareCreationIntakesForBackupRestore/);
assert.ok(mainSource.includes('table === "condominium_creation_intakes"'));
assert.ok(mainSource.includes("prepareCreationIntakesForBackupRestore("));
assert.ok(mainSource.includes("WORKSPACE_BACKUP_EXPORT_TABLES"));
assert.ok(mainSource.includes("loadPaginatedWorkspaceRows(supabase, profile.workspaceId, table, orderBy, null)"));
assert.ok(backendSource.includes('from("condominium_creation_intakes")'));
assert.ok(mainSource.includes("storagePath: storedDocuments.find"));
assert.ok(backendSource.includes('const path = workspaceId + "/"'));
assert.ok(packageJson.scripts.test.includes("test-workspace-backup-creation-intakes.mjs"));

const tableStart = schemaSource.indexOf('CREATE TABLE "public"."condominium_creation_intakes"');
const tableEnd = schemaSource.indexOf("\n);", tableStart);
assert.ok(tableStart >= 0 && tableEnd > tableStart, "creation intake table must exist in the baseline");
const tableDefinition = schemaSource.slice(tableStart, tableEnd);
assert.match(tableDefinition, /"workspace_id"\s+uuid\s+NOT NULL/);
assert.match(tableDefinition, /"source_documents"\s+jsonb/);
assert.match(schemaSource, /jsonb_typeof\(source_documents\) = 'array'::text/);
assert.match(schemaSource, /condominium_creation_intakes_created_by_fkey" FOREIGN KEY \(created_by\) REFERENCES auth\.users\(id\)/);
assert.match(schemaSource, /condominium_creation_intakes_confirmed_by_fkey" FOREIGN KEY \(confirmed_by\) REFERENCES auth\.users\(id\)/);
assert.match(schemaSource, /condominium_creation_intakes_created_condominium_id_fkey" FOREIGN KEY \(created_condominium_id\) REFERENCES condominiums\(id\) ON DELETE SET NULL/);
assert.match(schemaSource, /condominium_creation_intakes_workspace_id_fkey" FOREIGN KEY \(workspace_id\) REFERENCES workspaces\(id\) ON DELETE CASCADE/);

console.log("Workspace backup creation-intake regression checks passed.");
