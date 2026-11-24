import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceInstallments } from "../src/lib/accountingInstallmentPagination.ts";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(source, /loadWorkspaceInstallments\(supabase, workspaceId\)/);
assert.ok(packageJson.scripts.test.includes("test-accounting-installment-pagination.mjs"));

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

const first = Array.from({ length: 1000 }, (_, index) => ({ id: "installment-" + index, due_date: "2026-01-01", amount: 1 }));
const second = [{ id: "installment-1000", due_date: "2026-01-02", amount: 10 }];
const { client, requests } = mockClient(new Map([[0, first], [1000, second]]));
const result = await loadWorkspaceInstallments(client, "workspace-a");
assert.equal(result.data.length, 1001, "Installments beyond the PostgREST page cap must be loaded.");
assert.equal(result.data.reduce((sum, row) => sum + row.amount, 0), 1010);
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.equal(requests[0].table, "condominium_installments");
assert.equal(requests[0].workspaceId, "workspace-a");
assert.deepEqual(requests[0].orders, [["due_date", { ascending: true }], ["id", { ascending: true }]]);

const failing = mockClient(new Map([[0, first], [1000, second]]), 1000);
await assert.rejects(loadWorkspaceInstallments(failing.client, "workspace-a"), /page failure/);
assert.equal(failing.requests.length, 2, "A later-page error must abort instead of accepting partial installments.");
console.log("Accounting installment pagination regression checks passed.");
