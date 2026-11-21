import assert from "node:assert/strict";
import { loadActiveAllocationUnitMembers } from "../src/lib/accountingPagination.ts";

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, columns: null, filters: [], inFilters: [], orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        in(column, values) { state.inFilters.push([column, values]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, filters: state.filters.slice(), inFilters: state.inFilters.slice(), orders: state.orders.slice(), from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("second page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `member-${index}`,
  unit_id: `unit-${index % 3}`,
  role: "resident",
  active: true,
  data: { role: "Proprietario" },
}));
const lateOwner = {
  id: "member-late-owner",
  unit_id: "unit-3",
  role: "resident",
  active: true,
  data: { role: "Proprietario" },
};
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, [lateOwner]]]));
const result = await loadActiveAllocationUnitMembers(client, "condominium-1", ["unit-1", "unit-2", "unit-3"]);
assert.equal(result.error, null);
assert.equal(result.data.length, 1001, "active members beyond the first 1,000 rows must be retained");
assert.equal(result.data.at(-1).id, "member-late-owner", "the owner beyond the cap must remain available for installment unification");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "member lookup must fetch subsequent pages");
assert.equal(requests[0].table, "condominium_members");
assert.equal(requests[0].columns, "id,unit_id,role,active,data");
assert.deepEqual(requests[0].filters, [["condominium_id", "condominium-1"], ["active", true]]);
assert.deepEqual(requests[0].inFilters, [["unit_id", ["unit-1", "unit-2", "unit-3"]]]);
assert.deepEqual(requests[0].orders, [["id", { ascending: true }]], "pagination requires stable ID ordering");

const failing = mockClient(new Map([[0, firstPage]]), 1000);
const failedResult = await loadActiveAllocationUnitMembers(failing.client, "condominium-1", ["unit-1"]);
assert.equal(failedResult.data, null, "failed pagination must not return partial member data");
assert.match(failedResult.error?.message ?? "", /second page failed/);

const empty = mockClient(new Map());
assert.deepEqual(await loadActiveAllocationUnitMembers(empty.client, "condominium-1", []), { data: [], error: null });
assert.equal(empty.requests.length, 0, "empty unit selection must not issue a query");
console.log("Accounting unit-member pagination regression checks passed.");
