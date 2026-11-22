import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceMillesimalValues } from "../src/lib/accountingMillesimalValuePagination.mjs";

function mockClient(pages, failOffset = null) {
  const calls = [];
  const client = {
    from(table) {
      const state = { table, columns: null, filters: [], orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          calls.push({ ...state, filters: state.filters.slice(), orders: state.orders.slice(), from, to });
          if ( from === failOffset) return Promise.resolve({ data: null, error: new Error("second-page failure") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, calls };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: "value-" + String(index).padStart(4, "0"),
  table_id: "table-a",
  unit_id: "unit-" + String(index).padStart(4, "0"),
  value: index,
}));
const secondPage = [{
  id: "value-1000",
  table_id: "table-b",
  unit_id: "unit-1000",
  value: 1000,
}];
const { client, calls } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const result = await loadWorkspaceMillesimalValues(client, "workspace-a");
assert.equal(result.data.length, 1001, "Millesimal values after the PostgREST cap must not be omitted.");
assert.deepEqual(calls.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.equal(calls[0].table, "condominium_millesimal_values");
assert.deepEqual(calls[0].filters, [["workspace_id", "workspace-a"]]);
assert.deepEqual(calls[0].orders, [
  ["table_id", { ascending: true }],
  ["unit_id", { ascending: true }],
  ["id", { ascending: true }],
]);

const failing = mockClient(new Map([[0, firstPage], [1000, secondPage]]), 1000);
await assert.rejects(
  loadWorkspaceMillesimalValues(failing.client, "workspace-a"),
  /second-page failure/,
  "a failed page must reject the load instead of returning partial values",
);
assert.equal(failing.calls.length, 2);

const empty = mockClient(new Map([[0, []]]));
assert.deepEqual(await loadWorkspaceMillesimalValues(empty.client, "workspace-a"), { data: [], error: null });
assert.equal(empty.calls.length, 1);

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const loadStart = source.indexOf("async function load()");
assert.ok(loadStart >= 0, "AccountingPage load handler must exist");
const loadEnd = source.indexOf("useEffect(() => {", loadStart);
assert.ok(loadEnd > loadStart, "AccountingPage load handler must be bounded");
const loadHandler = source.slice(loadStart, loadEnd);
assert.match(loadHandler, /loadWorkspaceMillesimalValues\(supabase, workspaceId\)/);
assert.doesNotMatch(loadHandler, /\.from\(["']condominium_millesimal_values["']\)[\s\S]*?\.eq\(["']workspace_id["'],\s*workspaceId\)/);
assert.ok(packageJson.scripts.test.includes("test-accounting-millesimal-values-pagination.mjs"), "Regression must be wired into npm test");
console.log("Accounting millesimal-values pagination runtime regression: PASS");
