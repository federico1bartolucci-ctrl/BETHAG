import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceConsumptionReadings } from "../src/lib/accountingConsumptionReadingPagination.ts";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(source, /loadWorkspaceConsumptionReadings\(supabase, workspaceId\)/);
assert.ok(packageJson.scripts.test.includes("test-accounting-consumption-reading-pagination.mjs"));

function mockClient(pages, failOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, workspaceId: null, orders: [] };
      const query = {
        select() { return query; },
        eq(column, value) { if (column === "workspace_id") state.workspaceId = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, orders: state.orders.slice(), from, to });
          if (from === failOffset) return Promise.resolve({ data: null, error: new Error("page failure") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const first = Array.from({ length: 1000 }, (_, index) => ({ id: "reading-" + index, period_end: "2026-01-31", charge_amount: 1 }));
const second = [{ id: "reading-1000", period_end: "2026-02-28", charge_amount: 10 }];
const { client, requests } = mockClient(new Map([[0, first], [1000, second]]));
const result = await loadWorkspaceConsumptionReadings(client, "workspace-a");
assert.equal(result.data.length, 1001, "Consumption readings beyond the PostgREST page cap must be loaded.");
assert.equal(result.data.reduce((sum, row) => sum + row.charge_amount, 0), 1010);
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.equal(requests[0].table, "condominium_consumption_readings");
assert.equal(requests[0].workspaceId, "workspace-a");
assert.deepEqual(requests[0].orders, [["period_end", { ascending: false }], ["id", { ascending: true }]]);

const failing = mockClient(new Map([[0, first], [1000, second]]), 1000);
await assert.rejects(loadWorkspaceConsumptionReadings(failing.client, "workspace-a"), /page failure/);
assert.equal(failing.requests.length, 2, "A later-page error must abort rather than show incomplete consumption history.");
console.log("Accounting consumption-reading pagination regression checks passed.");
