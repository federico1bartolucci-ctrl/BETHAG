import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

function sortRows(rows, column) {
  return rows.sort((a, b) => {
    if (a[column] === null && b[column] !== null) return 1;
    if (a[column] !== null && b[column] === null) return -1;
    if (a[column] !== null && b[column] !== null) {
      const compare = String(a[column]).localeCompare(String(b[column]));
      if (compare) return compare;
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

function makeClient(initialRows, { insertBeforePage = null, inserts = [], deleteBeforePage = null, deleteIds = [], failPage = null } = {}) {
  const records = initialRows.slice();
  const requests = [];
  let pageNumber = 0;
  const client = {
    from(table) {
      const state = { table, workspaceId: null, select: null, orders: [], cursorFilter: null, nullCursor: false, idGt: null };
      const query = {
        select(columns) { state.select = columns; return query; },
        eq(column, value) { if (column === "workspace_id") state.workspaceId = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        or(filter) { state.cursorFilter = filter; return query; },
        is(column, value) { if (column === state.orders[0]?.[0] && value === null) state.nullCursor = true; return query; },
        gt(column, value) { if (column === "id") state.idGt = value; return query; },
        range(from, to) {
          pageNumber += 1;
          requests.push({ ...state, orders: state.orders.slice(), from, to, pageNumber });
          if (pageNumber === insertBeforePage) records.push(...inserts);
          if (pageNumber === deleteBeforePage) {
            for (const id of deleteIds) {
              const index = records.findIndex((row) => row.id === id);
              if (index >= 0) records.splice(index, 1);
            }
          }
          if (pageNumber === failPage) return Promise.resolve({ data: null, error: new Error("workspace page failure") });
          const orderColumn = state.orders[0]?.[0] ?? "created_at";
          let filtered = records.filter((row) => row.workspace_id === state.workspaceId);
          if (state.cursorFilter) {
            const gtPrefix = `${orderColumn}.gt.`;
            const eqPrefix = `,and(${orderColumn}.eq.`;
            const idPrefix = ",id.gt.";
            const nullSuffix = `),${orderColumn}.is.null`;
            assert.ok(state.cursorFilter.startsWith(gtPrefix), "cursor must start with order-column greater-than");
            const tail = state.cursorFilter.slice(gtPrefix.length);
            const eqIndex = tail.indexOf(eqPrefix);
            assert.ok(eqIndex > 0, "cursor must include an equal-value branch");
            const greaterThanValue = tail.slice(0, eqIndex);
            const equalTail = tail.slice(eqIndex + eqPrefix.length);
            const idIndex = equalTail.indexOf(idPrefix);
            assert.ok(idIndex > 0, "cursor must include the ID tie-break");
            const equalValue = equalTail.slice(0, idIndex);
            const idTail = equalTail.slice(idIndex + idPrefix.length);
            assert.ok(idTail.endsWith(nullSuffix), "cursor must include trailing NULL values");
            const greaterThanId = idTail.slice(0, -nullSuffix.length);
            assert.ok(greaterThanId.length, "cursor ID must not be empty");
            filtered = filtered.filter((row) => row[orderColumn] === null || String(row[orderColumn]) > greaterThanValue || (String(row[orderColumn]) === equalValue && String(row.id) > greaterThanId));
          } else if (state.nullCursor) {
            filtered = filtered.filter((row) => row[orderColumn] === null && String(row.id) > String(state.idGt));
          }
          const sorted = sortRows(filtered, orderColumn);
          return Promise.resolve({ data: sorted.slice(from, to + 1), error: null });
        },
      };
      return query;
    },
  };
  return { client, records, requests };
}

async function loadLegacyOffsetRows(client, workspaceId, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from("documents").select("*").eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true, nullsFirst: false }).order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

const originals = Array.from({ length: 1001 }, (_, i) => ({
  id: `row-${String(i).padStart(4, "0")}`,
  workspace_id: "workspace-1",
  created_at: "2026-01-01",
}));
const foreign = [{ id: "foreign-1", workspace_id: "workspace-2", created_at: "2025-12-31" }];

// Ordinary hydration: the API limit is handled with bounded keyset pages.
const staticClient = makeClient([...originals, ...foreign]);
const staticResult = await loadWorkspacePaginatedRows(staticClient.client, "documents", "workspace-1");
assert.equal(staticResult.data.length, 1001);
assert.deepEqual(staticClient.requests.map(({ from, to }) => [from, to]), [[0, 999], [0, 999]]);
assert.ok(staticClient.requests.every((request) => request.workspaceId === "workspace-1"));
assert.deepEqual(staticClient.requests[0].orders, [["created_at", { ascending: true, nullsFirst: false }], ["id", { ascending: true }]]);
assert.equal(staticClient.requests[0].table, "documents");
assert.equal(new Set(staticResult.data.map((row) => row.id)).size, 1001);

// Null sort values remain after dated rows and are reachable from a dated cursor.
const nullRows = [...Array.from({ length: 1000 }, (_, i) => ({ id: `date-${String(i).padStart(4, "0")}`, workspace_id: "workspace-1", created_at: "2026-01-01" })), { id: "null-0001", workspace_id: "workspace-1", created_at: null }, { id: "null-0002", workspace_id: "workspace-1", created_at: null }];
const nullClient = makeClient(nullRows);
const nullResult = await loadWorkspacePaginatedRows(nullClient.client, "documents", "workspace-1");
assert.equal(nullResult.data.length, 1002);
assert.deepEqual(nullResult.data.slice(-2).map((row) => row.id), ["null-0001", "null-0002"]);

// When NULL dates themselves exceed one page, the NULL-ID cursor must reach the tail.
const nullPagedRows = [...Array.from({ length: 1000 }, (_, i) => ({ id: `dated-${String(i).padStart(4, "0")}`, workspace_id: "workspace-1", created_at: "2026-01-01" })), ...Array.from({ length: 1001 }, (_, i) => ({ id: `null-${String(i).padStart(4, "0")}`, workspace_id: "workspace-1", created_at: null }))];
const nullPagedClient = makeClient(nullPagedRows);
const nullPagedResult = await loadWorkspacePaginatedRows(nullPagedClient.client, "documents", "workspace-1");
assert.equal(nullPagedResult.data.length, 2001);
assert.equal(nullPagedResult.data.at(-1).id, "null-1000");
assert.deepEqual(nullPagedClient.requests.map(({ from, to }) => [from, to]), [[0, 999], [0, 999], [0, 999]]);

// Reproduce legacy offset drift caused by concurrent inserts before page two.
const inserts = [
  { id: "new-0001", workspace_id: "workspace-1", created_at: "2025-12-30" },
  { id: "new-0002", workspace_id: "workspace-1", created_at: "2025-12-31" },
];
const legacyInsert = makeClient(originals, { insertBeforePage: 2, inserts });
const legacyInsertRows = await loadLegacyOffsetRows(legacyInsert.client, "workspace-1");
const legacyInsertIds = legacyInsertRows.map((row) => row.id);
assert.ok(legacyInsertIds.length > new Set(legacyInsertIds).size, "legacy offset paging must reproduce duplicates after concurrent inserts");
const keysetInsert = makeClient(originals, { insertBeforePage: 2, inserts });
const keysetInsertRows = await loadWorkspacePaginatedRows(keysetInsert.client, "documents", "workspace-1");
assert.deepEqual(keysetInsertRows.data.map((row) => row.id), originals.map((row) => row.id), "keyset paging must preserve the original rows exactly once when inserts shift the prefix");

// Reproduce legacy offset drift caused by deletes before page two.
const deleteIds = ["row-0000", "row-0001"];
const legacyDelete = makeClient(originals, { deleteBeforePage: 2, deleteIds });
const legacyDeleteRows = await loadLegacyOffsetRows(legacyDelete.client, "workspace-1");
assert.ok(!legacyDeleteRows.some((row) => row.id === "row-1000"), "legacy offset paging must reproduce an omitted row after concurrent deletes");
const keysetDelete = makeClient(originals, { deleteBeforePage: 2, deleteIds });
const keysetDeleteRows = await loadWorkspacePaginatedRows(keysetDelete.client, "documents", "workspace-1");
assert.deepEqual(keysetDeleteRows.data.map((row) => row.id), originals.map((row) => row.id), "keyset paging must preserve the rows already fetched and reach the remaining rows after deletes");

// Input validation and fail-closed page handling.
await assert.rejects(loadWorkspacePaginatedRows(staticClient.client, "documents", "", {}), /Workspace non disponibile/);
await assert.rejects(loadWorkspacePaginatedRows(staticClient.client, "documents", "workspace-1", { pageSize: 1001 }), /Dimensione pagina non valida/);
await assert.rejects(loadWorkspacePaginatedRows(staticClient.client, "documents", "workspace-1", { orderBy: "created_at,malicious" }), /Colonna di ordinamento non valida/);
const failing = makeClient(originals, { failPage: 2 });
await assert.rejects(loadWorkspacePaginatedRows(failing.client, "documents", "workspace-1"), /workspace page failure/);
assert.equal(failing.requests.length, 2);

const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const paginatedTables = [
  "condominiums", "documents", "deadlines", "assemblies", "suppliers", "activities", "communications",
  "condominium_requests", "condominium_suppliers", "condominium_units", "condominium_member_transfers", "condominium_works", "condominium_fiscal_years",
  "condominium_ledger_entries", "condominium_funds", "condominium_expense_allocations",
  "condominium_tax_obligations", "condominium_legal_cases", "portal_access", "workspace_members",
];
for (const table of paginatedTables) {
  assert.match(backend, new RegExp(`loadWorkspacePaginatedRows\\(\\s*supabase\\s*,\\s*["']${table}["']`), `Bootstrap query for ${table} must be paginated`);
}
console.log(`Workspace keyset pagination runtime regression: PASS (${paginatedTables.length} bootstrap collections)`);
