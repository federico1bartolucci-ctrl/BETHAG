import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

function makeClient(rowsByOffset, { failOffset = null } = {}) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, workspaceId: null, select: null, orders: [] };
      const query = {
        select(columns) { state.select = columns; return query; },
        eq(column, value) { if (column === "workspace_id") state.workspaceId = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, orders: state.orders.slice(), from, to });
          if (from === failOffset) return Promise.resolve({ data: null, error: new Error("page failure") });
          return Promise.resolve({ data: rowsByOffset.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const first = Array.from({ length: 1000 }, (_, i) => ({ id: `row-${String(i).padStart(4, "0")}`, created_at: "2026-01-01" }));
const second = [{ id: "row-1000", created_at: "2026-01-02" }];
const { client, requests } = makeClient(new Map([[0, first], [1000, second]]));
const result = await loadWorkspacePaginatedRows(client, "documents", "workspace-1");
assert.equal(result.data.length, 1001);
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.ok(requests.every(request => request.workspaceId === "workspace-1"));
assert.deepEqual(requests[0].orders, [["created_at", { ascending: true }], ["id", { ascending: true }]]);
assert.equal(requests[0].table, "documents");
await assert.rejects(loadWorkspacePaginatedRows(client, "documents", "", {}), /Workspace non disponibile/);
await assert.rejects(loadWorkspacePaginatedRows(client, "documents", "workspace-1", { pageSize: 1001 }), /Dimensione pagina non valida/);
const failing = makeClient(new Map([[0, first], [1000, second]]), { failOffset: 1000 });
await assert.rejects(loadWorkspacePaginatedRows(failing.client, "documents", "workspace-1"), /page failure/);
assert.equal(failing.requests.length, 2);
const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");

const paginatedTables = [
  "documents", "deadlines", "assemblies", "suppliers", "activities", "communications",
  "condominium_requests", "condominium_works", "condominium_fiscal_years",
  "condominium_ledger_entries", "condominium_funds", "condominium_expense_allocations",
  "condominium_tax_obligations", "condominium_legal_cases", "portal_access", "workspace_members",
];
for (const table of paginatedTables) {
  assert.match(backend, new RegExp(`loadWorkspacePaginatedRows\\(supabase, ["']${table}["']`), `Bootstrap query for ${table} must be paginated`);
}
console.log(`Workspace pagination regression checks: PASS (${paginatedTables.length} bootstrap collections)`);
