import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fetchWorkspaceWorkProgress } from "../src/lib/backend-work-progress-pagination.js";

function createMockClient(pages) {
  const calls = [];
  return {
    calls,
    from(table) {
      const query = { table, columns: null, filters: [], orders: [], range: null };
      return {
        select(columns) { query.columns = columns; return this; },
        eq(column, value) { query.filters.push([column, value]); return this; },
        order(column, options) { query.orders.push([column, options]); return this; },
        range(from, to) {
          query.range = [from, to];
          calls.push(query);
          const page = pages[calls.length - 1] ?? { data: [], error: null };
          return Promise.resolve(page);
        },
      };
    },
  };
}

const firstPage = Array.from({ length: 1000 }, (_, i) => ({
  work_id: "work-a",
  amount: 1,
  id: String(i).padStart(4, "0"),
}));
const secondPage = [
  { work_id: "work-a", amount: 10, id: "1000" },
  { work_id: "work-a", amount: 10, id: "1001" },
  { work_id: "work-b", amount: 10, id: "1002" },
];
const client = createMockClient([{ data: firstPage, error: null }, { data: secondPage, error: null }]);
const rows = await fetchWorkspaceWorkProgress(client, "workspace-test");
assert.equal(rows.length, 1003, "All progress rows must be collected beyond the PostgREST page cap.");
assert.equal(rows.filter((row) => row.work_id === "work-a").reduce((sum, row) => sum + row.amount, 0), 1020);
assert.equal(rows.filter((row) => row.work_id === "work-b").reduce((sum, row) => sum + row.amount, 0), 10);
assert.deepEqual(client.calls.map((call) => call.range), [[0, 999], [1000, 1999]]);
for (const call of client.calls) {
  assert.equal(call.table, "condominium_work_progress");
  assert.equal(call.columns, "work_id,amount");
  assert.deepEqual(call.filters, [["workspace_id", "workspace-test"]]);
  assert.deepEqual(call.orders.map((order) => order[0]), ["work_id", "id"]);
}

const failingClient = createMockClient([
  { data: firstPage, error: null },
  { data: null, error: new Error("second-page failure") },
]);
await assert.rejects(() => fetchWorkspaceWorkProgress(failingClient, "workspace-test"), /second-page failure/);
assert.equal(failingClient.calls.length, 2, "A page error must abort hydration instead of silently returning partial totals.");

const emptyClient = createMockClient([{ data: [], error: null }]);
assert.deepEqual(await fetchWorkspaceWorkProgress(emptyClient, "workspace-test"), []);
assert.equal(emptyClient.calls.length, 1);

const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
assert.match(backend, /fetchWorkspaceWorkProgress\(client, workspaceId\)/);
assert.match(backend, /workIdsSet\.has\(key\)/);
console.log("PASS: work-progress hydration paginates, preserves stable order, aggregates later pages, and fails closed on page errors.");
