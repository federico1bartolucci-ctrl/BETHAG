import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkReconciliationLedger } from "../src/lib/condominiumWorkReconciliationPagination.ts";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("export async function reconcileCondominiumWork(");
const end = source.indexOf("\nexport async function ", start + 1);
assert.ok(start >= 0 && end > start, "work reconciliation function must exist");
const section = source.slice(start, end);
assert.match(section, /loadWorkReconciliationLedger\(supabase, workspaceId, work\.condominium_id\)/, "work reconciliation must use the paginated ledger loader");
assert.doesNotMatch(section, /\.from\("condominium_ledger_entries"\)/, "reconciliation must not query the ledger in one capped request");
assert.ok(packageJson.scripts.test.includes("test-work-reconciliation-ledger-pagination.mjs"), "regression test must be wired into npm test");

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, columns: null, filters: [], orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, filters: state.filters.slice(), orders: state.orders.slice(), from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `ledger-${index}`, amount: 10, payment_status: "Pagato", description: "SAL", data: {}, document_id: null,
}));
const secondPage = [
  { id: "ledger-1000", amount: 250, payment_status: "Pagato", description: "SAL beyond cap", data: {}, document_id: null },
];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const rows = await loadWorkReconciliationLedger(client, "workspace-1", "condominium-1");
assert.equal(rows.length, 1001, "ledger rows beyond the 1,000-row cap must be included in work reconciliation");
assert.equal(rows.at(-1).amount, 250, "late ledger rows must be retained for reconciliation totals");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "ledger query must fetch subsequent pages");
assert.equal(requests[0].table, "condominium_ledger_entries");
assert.equal(requests[0].columns, "id,amount,payment_status,description,data,document_id");
assert.deepEqual(requests[0].filters, [["workspace_id", "workspace-1"], ["condominium_id", "condominium-1"], ["direction", "Uscita"]], "ledger query must preserve workspace, condominium, and outgoing scope");
assert.deepEqual(requests[0].orders, [["id", { ascending: true }]], "pagination must have stable ordering");

const failing = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadWorkReconciliationLedger(failing.client, "workspace-1", "condominium-1"),
  /page failed/,
  "a failed later page must reject instead of silently producing partial accounting data",
);
const missing = mockClient(new Map());
assert.deepEqual(await loadWorkReconciliationLedger(missing.client, "", "condominium-1"), [], "missing workspace must avoid queries");
assert.equal(missing.requests.length, 0);
console.log("Work reconciliation ledger pagination regression checks passed.");
