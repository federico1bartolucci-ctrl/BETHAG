import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadPaginatedWorkspaceRows } from "../src/lib/paginatedWorkspaceRows.ts";

const source = await readFile("src/RegisterPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const tables = [
  ["condominium_register_items", "expiry_date"],
  ["condominium_suppliers", "business_name"],
  ["condominium_works", "start_date"],
  ["documents", null],
  ["condominium_funds", "name"],
  ["condominium_work_progress", "progress_date"],
];
for (const [table, orderBy] of tables) {
  const orderArg = orderBy === null ? "null" : `"${orderBy}"`;
  const pattern = new RegExp(
    `loadPaginatedWorkspaceRows\\(supabase,\\s*workspaceId,\\s*"${table}",\\s*${orderArg}\\s*\\)`
  );
  assert.match(source, pattern, `RegisterPage must paginate ${table}`);
}
assert.ok(packageJson.scripts.test.includes("test-register-page-pagination.mjs"), "pagination regression test must be included in npm test");

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, filters: [], orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ table: state.table, columns: state.columns, filters: state.filters, orders: state.orders, from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
const secondPage = [{ id: "1000" }, { id: "1001" }, { id: "1002" }];
const pages = new Map([[0, firstPage], [1000, secondPage]]);
const { client, requests } = mockClient(pages);
const rows = await loadPaginatedWorkspaceRows(client, "workspace-1", "condominium_works", "start_date");
assert.equal(rows.length, 1003, "rows across all pages must be retained");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "page offsets must advance by 1,000");
assert.equal(requests[0].table, "condominium_works");
assert.deepEqual(requests[0].filters, [["workspace_id", "workspace-1"]]);
assert.deepEqual(requests[0].orders, [["start_date", { ascending: true }], ["id", { ascending: true }]], "page ordering must be stable");

const shortMock = mockClient(new Map([[0, [{ id: "only" }]]));
assert.deepEqual(await loadPaginatedWorkspaceRows(shortMock.client, "workspace-1", "documents", null), [{ id: "only" }]);
assert.equal(shortMock.requests.length, 1, "short final page must stop pagination");

const failingMock = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadPaginatedWorkspaceRows(failingMock.client, "workspace-1", "documents"),
  /page failed/,
  "pagination errors must propagate rather than silently return partial data"
);
console.log("Register-page pagination regression checks passed.");
