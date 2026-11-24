import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  WORKSPACE_BACKUP_EXPORT_TABLES,
  WORKSPACE_BACKUP_RESTORE_ORDER,
} from "../src/lib/workspaceBackupTables.mjs";
import { loadPaginatedWorkspaceRows } from "../src/lib/paginatedWorkspaceRows.ts";

const criticalAccountingTables = [
  "condominium_accounting_settings",
  "condominium_member_transfers",
  "condominium_millesimal_values",
  "condominium_fiscal_carryovers",
  "condominium_fiscal_carryover_compensations",
];

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, label + " must not contain duplicates");
}

assertUnique(WORKSPACE_BACKUP_EXPORT_TABLES, "backup export manifest");
assertUnique(WORKSPACE_BACKUP_RESTORE_ORDER, "backup restore order");

for (const table of criticalAccountingTables) {
  assert.equal(WORKSPACE_BACKUP_EXPORT_TABLES.filter((value) => value === table).length, 1,
    table + " must be exported exactly once");
  assert.equal(WORKSPACE_BACKUP_RESTORE_ORDER.filter((value) => value === table).length, 1,
    table + " must be restored exactly once");
}

const restoreIndex = (table) => WORKSPACE_BACKUP_RESTORE_ORDER.indexOf(table);
assert.ok(restoreIndex("condominiums") < restoreIndex("condominium_accounting_settings"));
assert.ok(restoreIndex("condominium_millesimal_tables") < restoreIndex("condominium_millesimal_values"));
assert.ok(restoreIndex("condominium_units") < restoreIndex("condominium_millesimal_values"));
assert.ok(restoreIndex("condominium_units") < restoreIndex("condominium_member_transfers"));
assert.ok(restoreIndex("condominium_members") < restoreIndex("condominium_member_transfers"));
assert.ok(restoreIndex("condominium_fiscal_years") < restoreIndex("condominium_fiscal_carryovers"));
assert.ok(restoreIndex("condominium_units") < restoreIndex("condominium_fiscal_carryovers"));
assert.ok(restoreIndex("condominium_members") < restoreIndex("condominium_fiscal_carryovers"));
assert.ok(restoreIndex("condominium_installments") < restoreIndex("condominium_fiscal_carryover_compensations"));
assert.ok(restoreIndex("condominium_fiscal_carryovers") < restoreIndex("condominium_fiscal_carryover_compensations"));

const workspaceId = "11111111-1111-4111-8111-111111111111";
const foreignWorkspaceId = "22222222-2222-4222-8222-222222222222";
const calls = [];
const datasets = new Map(criticalAccountingTables.map((table) => [
  table,
  [
    { id: table + "-local", workspace_id: workspaceId },
    { id: table + "-foreign", workspace_id: foreignWorkspaceId },
  ],
]));

const mockClient = {
  from(table) {
    let scopedWorkspace = null;
    let orderColumn = null;
    const query = {
      select() { return query; },
      eq(column, value) {
        assert.equal(column, "workspace_id", "backup table reads must use workspace_id scope");
        scopedWorkspace = value;
        return query;
      },
      order(column) { orderColumn = column; return query; },
      async range(from, to) {
        calls.push({ table, scopedWorkspace, orderColumn, from, to });
        const scoped = (datasets.get(table) ?? []).filter((row) => row.workspace_id === scopedWorkspace);
        return { data: scoped.slice(from, to + 1), error: null };
      },
    };
    return query;
  },
};

for (const table of criticalAccountingTables) {
  const rows = await loadPaginatedWorkspaceRows(mockClient, workspaceId, table, "id", null);
  assert.deepEqual(rows.map((row) => row.id), [table + "-local"],
    table + " export must exclude rows from another workspace");
}

assert.equal(calls.length, criticalAccountingTables.length);
assert.ok(calls.every((call) => call.scopedWorkspace === workspaceId));
assert.ok(calls.every((call) => call.orderColumn === "id"));
assert.ok(calls.every((call) => call.from === 0 && call.to === 999));

const [mainSource, schemaSource, packageJson] = await Promise.all([
  readFile(new URL("../src/main.tsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261017000001_bethag_baseline_schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);
assert.match(mainSource, /import \{ WORKSPACE_BACKUP_EXPORT_TABLES, WORKSPACE_BACKUP_RESTORE_ORDER \} from "\.\/lib\/workspaceBackupTables\.mjs";/);
assert.match(mainSource, /const tableNames = WORKSPACE_BACKUP_EXPORT_TABLES;/);
assert.match(mainSource, /const restoreOrder = WORKSPACE_BACKUP_RESTORE_ORDER;/);
assert.ok(packageJson.scripts.test.includes("test-workspace-backup-accounting-tables.mjs"));

for (const table of criticalAccountingTables) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const definition = schemaSource.match(new RegExp('CREATE TABLE "public"\\."' + escaped + '" \\(([\\s\\S]*?)\\n\\);'));
  assert.ok(definition, table + " must exist in the baseline schema");
  assert.match(definition[1], /"workspace_id"\s+uuid/,
    table + " must support the generic workspace-scoped backup loader");
}

console.log("Workspace backup accounting continuity table regression checks passed.");
