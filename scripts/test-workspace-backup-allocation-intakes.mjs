import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  WORKSPACE_BACKUP_EXPORT_TABLES,
  WORKSPACE_BACKUP_RESTORE_ORDER,
} from "../src/lib/workspaceBackupTables.mjs";
import { prepareAllocationIntakesForBackupRestore } from "../src/lib/backupAllocationIntakesRestore.mjs";
import { loadPaginatedWorkspaceRows } from "../src/lib/paginatedWorkspaceRows.ts";

const table = "condominium_allocation_intakes";
const workspaceId = "11111111-1111-4111-8111-111111111111";
const foreignWorkspaceId = "22222222-2222-4222-8222-222222222222";
const condominiumId = "33333333-3333-4333-8333-333333333333";
const foreignCondominiumId = "44444444-4444-4444-8444-444444444444";

function assertOnce(values, label) {
  assert.equal(values.filter((value) => value === table).length, 1, label + " must contain the table exactly once");
}

assertOnce(WORKSPACE_BACKUP_EXPORT_TABLES, "export manifest");
assertOnce(WORKSPACE_BACKUP_RESTORE_ORDER, "restore manifest");

const restoreIndex = (name) => WORKSPACE_BACKUP_RESTORE_ORDER.indexOf(name);
for (const parent of ["condominiums", "documents", "condominium_millesimal_tables", "condominium_ledger_entries"]) {
  assert.ok(restoreIndex(parent) >= 0, parent + " must be restored");
  assert.ok(restoreIndex(parent) < restoreIndex(table), table + " must be restored after " + parent);
}

const existingRows = [
  {
    id: "existing-intake",
    workspace_id: workspaceId,
    condominium_id: condominiumId,
    created_by: "destination-creator",
    confirmed_by: "destination-confirmer",
  },
  {
    id: "foreign-owned-intake",
    workspace_id: foreignWorkspaceId,
    condominium_id: condominiumId,
    created_by: "foreign-user",
    confirmed_by: null,
  },
  {
    id: "moved-intake",
    workspace_id: workspaceId,
    condominium_id: foreignCondominiumId,
    created_by: null,
    confirmed_by: null,
  },
];

const relatedRows = {
  documents: [
    { id: "local-document", workspace_id: workspaceId, condominium_id: condominiumId },
    { id: "workspace-document", workspace_id: workspaceId, condominium_id: null },
    { id: "foreign-document", workspace_id: foreignWorkspaceId, condominium_id: condominiumId },
  ],
  ledgerEntries: [
    { id: "local-ledger", workspace_id: workspaceId, condominium_id: condominiumId },
    { id: "foreign-ledger", workspace_id: foreignWorkspaceId, condominium_id: condominiumId },
  ],
  allocationTables: [
    { id: "local-table", workspace_id: workspaceId, condominium_id: condominiumId },
    { id: "foreign-table", workspace_id: workspaceId, condominium_id: foreignCondominiumId },
  ],
  units: [
    { id: "unit-1", workspace_id: workspaceId, condominium_id: condominiumId },
    { id: "unit-2", workspace_id: workspaceId, condominium_id: condominiumId },
    { id: "foreign-unit", workspace_id: workspaceId, condominium_id: foreignCondominiumId },
  ],
};

const backupRows = [
  {
    id: "existing-intake",
    workspace_id: foreignWorkspaceId,
    condominium_id: condominiumId,
    document_id: "local-document",
    ledger_entry_id: "local-ledger",
    allocation_table_id: "local-table",
    created_by: "backup-creator",
    confirmed_by: "backup-confirmer",
    status: "Confermato",
    confirmed_at: "2026-11-20T10:00:00.000Z",
    rows: [{ unit_id: "unit-1", amount: 120 }],
  },
  {
    id: "new-intake",
    workspace_id: foreignWorkspaceId,
    condominium_id: condominiumId,
    document_id: "workspace-document",
    ledger_entry_id: "local-ledger",
    allocation_table_id: "local-table",
    created_by: "deleted-user",
    confirmed_by: "deleted-user",
    status: "Confermato",
    confirmed_at: "2026-11-21T10:00:00.000Z",
    rows: [{ unit_id: "unit-2", amount: 80 }],
  },
  {
    id: "foreign-condominium-intake",
    workspace_id: workspaceId,
    condominium_id: foreignCondominiumId,
  },
  {
    id: "foreign-owned-intake",
    workspace_id: workspaceId,
    condominium_id: condominiumId,
  },
  {
    id: "moved-intake",
    workspace_id: workspaceId,
    condominium_id: condominiumId,
  },
  {
    id: "new-intake",
    workspace_id: workspaceId,
    condominium_id: condominiumId,
  },
  null,
];

const prepared = prepareAllocationIntakesForBackupRestore(
  backupRows,
  workspaceId,
  existingRows,
  [condominiumId],
  relatedRows
);

assert.equal(prepared.updateRows.length, 1);
assert.equal(prepared.insertRows.length, 1);
assert.equal(prepared.skipped, 5);

const [updated] = prepared.updateRows;
assert.equal(updated.workspace_id, workspaceId);
assert.equal(updated.created_by, "destination-creator", "existing creator attribution must remain destination-owned");
assert.equal(updated.confirmed_by, "destination-confirmer", "existing confirmer attribution must remain destination-owned");
assert.equal(updated.status, "Confermato");
assert.equal(updated.confirmed_at, "2026-11-20T10:00:00.000Z");

const [inserted] = prepared.insertRows;
assert.equal(inserted.workspace_id, workspaceId);
assert.equal(inserted.created_by, null, "backup auth user IDs must not be replayed into another auth context");
assert.equal(inserted.confirmed_by, null, "backup auth user IDs must not be replayed into another auth context");
assert.equal(inserted.status, "Confermato");
assert.equal(inserted.confirmed_at, "2026-11-21T10:00:00.000Z");
assert.deepEqual(inserted.rows, [{ unit_id: "unit-2", amount: 80 }]);

const invalidReferenceRows = [
  {
    id: "foreign-document-intake",
    condominium_id: condominiumId,
    document_id: "foreign-document",
    ledger_entry_id: "local-ledger",
    allocation_table_id: "local-table",
    rows: [{ unit_id: "unit-1", amount: 10 }],
  },
  {
    id: "foreign-ledger-intake",
    condominium_id: condominiumId,
    document_id: "local-document",
    ledger_entry_id: "foreign-ledger",
    allocation_table_id: "local-table",
    rows: [{ unit_id: "unit-1", amount: 10 }],
  },
  {
    id: "foreign-table-intake",
    condominium_id: condominiumId,
    document_id: "local-document",
    ledger_entry_id: "local-ledger",
    allocation_table_id: "foreign-table",
    rows: [{ unit_id: "unit-1", amount: 10 }],
  },
  {
    id: "foreign-unit-intake",
    condominium_id: condominiumId,
    document_id: "local-document",
    ledger_entry_id: "local-ledger",
    allocation_table_id: "local-table",
    rows: [{ unit_id: "foreign-unit", amount: 10 }],
  },
  {
    id: "missing-document-intake",
    condominium_id: condominiumId,
    document_id: "missing-document",
    ledger_entry_id: "local-ledger",
    allocation_table_id: "local-table",
    rows: [{ unit_id: "unit-1", amount: 10 }],
  },
];
const invalidReferences = prepareAllocationIntakesForBackupRestore(
  invalidReferenceRows,
  workspaceId,
  [],
  [condominiumId],
  relatedRows
);
assert.equal(invalidReferences.updateRows.length, 0, "foreign references must never update an existing intake");
assert.equal(invalidReferences.insertRows.length, 0, "foreign references must never be inserted");
assert.equal(invalidReferences.skipped, invalidReferenceRows.length, "every cross-workspace, cross-condominium or missing reference must fail closed");

assert.throws(
  () => prepareAllocationIntakesForBackupRestore(backupRows, "", existingRows, [condominiumId]),
  /Workspace di ripristino non valido/
);

const calls = [];
const mockClient = {
  from(requestedTable) {
    assert.equal(requestedTable, table);
    let scopedWorkspace = null;
    const query = {
      select() { return query; },
      eq(column, value) {
        assert.equal(column, "workspace_id");
        scopedWorkspace = value;
        return query;
      },
      order() { return query; },
      async range(from, to) {
        calls.push({ scopedWorkspace, from, to });
        return {
          data: [
            { id: "local-intake", workspace_id: scopedWorkspace },
            { id: "foreign-intake", workspace_id: foreignWorkspaceId },
          ].filter((row) => row.workspace_id === scopedWorkspace).slice(from, to + 1),
          error: null,
        };
      },
    };
    return query;
  },
};
const exportedRows = await loadPaginatedWorkspaceRows(mockClient, workspaceId, table, "id", null);
assert.deepEqual(exportedRows.map((row) => row.id), ["local-intake"]);
assert.equal(calls.length, 1);
assert.equal(calls[0].scopedWorkspace, workspaceId);
assert.equal(calls[0].from, 0);
assert.equal(calls[0].to, 999);

const [mainSource, accountingSource, schemaSource, packageJson] = await Promise.all([
  readFile(new URL("../src/main.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261017000001_bethag_baseline_schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

assert.match(mainSource, /prepareAllocationIntakesForBackupRestore/);
assert.ok(mainSource.includes("prepareAllocationIntakesForBackupRestore("));
assert.ok(mainSource.includes("{ documents, ledgerEntries, allocationTables, units }"));
assert.ok(mainSource.includes('loadPaginatedRowsByInFilter(supabase, "documents", "id", idsFor("document_id"), "id")'));
assert.ok(mainSource.includes('loadPaginatedRowsByInFilter(supabase, "condominium_ledger_entries", "id", idsFor("ledger_entry_id"), "id")'));
assert.ok(mainSource.includes('loadPaginatedRowsByInFilter(supabase, "condominium_millesimal_tables", "id", idsFor("allocation_table_id"), "id")'));
assert.ok(mainSource.includes('loadPaginatedRowsByInFilter(supabase, "condominium_units", "id", unitIds, "id")'));
assert.match(accountingSource, /\.from\("condominium_allocation_intakes"\)[\s\S]*?\.eq\("workspace_id",\s*workspaceId\)/);
assert.ok(packageJson.scripts.test.includes("test-workspace-backup-allocation-intakes.mjs"));

const tableDefinition = schemaSource.match(/CREATE TABLE "public"\."condominium_allocation_intakes" \(([\s\S]*?)\n\);/);
assert.ok(tableDefinition, "allocation intake table must exist in the baseline");
assert.match(tableDefinition[1], /"workspace_id"\s+uuid\s+NOT NULL/);
assert.match(tableDefinition[1], /"created_by"\s+uuid/);
assert.match(tableDefinition[1], /"confirmed_by"\s+uuid/);
assert.match(schemaSource, /condominium_allocation_intakes_created_by_fkey" FOREIGN KEY \(created_by\) REFERENCES auth\.users\(id\)/);
assert.match(schemaSource, /condominium_allocation_intakes_confirmed_by_fkey" FOREIGN KEY \(confirmed_by\) REFERENCES auth\.users\(id\)/);
assert.match(schemaSource, /condominium_allocation_intakes_document_id_fkey" FOREIGN KEY \(document_id\) REFERENCES documents\(id\)/);
assert.match(schemaSource, /condominium_allocation_intakes_ledger_entry_id_fkey" FOREIGN KEY \(ledger_entry_id\) REFERENCES condominium_ledger_entries\(id\)/);
assert.match(schemaSource, /condominium_allocation_intakes_allocation_table_id_fkey" FOREIGN KEY \(allocation_table_id\) REFERENCES condominium_millesimal_tables\(id\)/);
for (const relatedTable of ["documents", "condominium_ledger_entries", "condominium_millesimal_tables", "condominium_units"]) {
  const start = schemaSource.indexOf(`CREATE TABLE "public"."${relatedTable}"`);
  const end = schemaSource.indexOf("\n);", start);
  assert.ok(start >= 0 && end > start, relatedTable + " must exist in the baseline");
  const definition = schemaSource.slice(start, end);
  assert.match(definition, /"workspace_id"\s+uuid\s+NOT NULL/);
  assert.match(definition, /"condominium_id"\s+uuid/);
}

console.log("Workspace backup allocation-intake regression checks passed.");
