import assert from "node:assert/strict";
import { loadWorkspacePaginatedRows } from "../src/lib/accountingPagination.mjs";
function mockClient(pages, failOffset = null) {
  const requests = [];
  const client = { from(table) {
    const state = { table, workspaceId: null, orders: [], select: null };
    const query = {
      select(columns) { state.select = columns; return query; },
      eq(column, value) { if (column === "workspace_id") state.workspaceId = value; return query; },
      order(column, options) { state.orders.push([column, options]); return query; },
      range(from, to) {
        requests.push({ ...state, orders: state.orders.slice(), from, to });
        if (from === failOffset) return Promise.resolve({ data: null, error: new Error("page failure") });
        return Promise.resolve({ data: pages.get(from) ?? [], error: null });
      },
    };
    return query;
  }};
  return { client, requests };
}
const first = Array.from({ length: 1000 }, (_, i) => ({ id: "row-" + i, amount: 1 }));
const second = [{ id: "row-1000", amount: 5 }];
const { client, requests } = mockClient(new Map([[0, first], [1000, second]]));
const result = await loadWorkspacePaginatedRows(client, "table-a", "workspace-a", { orderBy: [{ column: "due_date" }] });
assert.equal(result.data.length, 1001);
assert.equal(result.data.reduce((sum, row) => sum + row.amount, 0), 1005);
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.equal(requests[0].table, "table-a");
assert.equal(requests[0].workspaceId, "workspace-a");
assert.deepEqual(requests[0].orders, [["due_date", { ascending: true }], ["id", { ascending: true }]]);
const failing = mockClient(new Map([[0, first], [1000, second]]), 1000);
await assert.rejects(loadWorkspacePaginatedRows(failing.client, "table-a", "workspace-a"), /page failure/);
console.log("Accounting shared pagination runtime checks passed.");
