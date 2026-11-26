import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAccountingCondominiumMembers } from "../src/lib/accountingCondominiumMembers.mjs";
const accountingSource = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const errorCheckStart = accountingSource.indexOf("for (const result of [");
const errorCheckEnd = accountingSource.indexOf("]) {", errorCheckStart);
assert.ok(errorCheckStart >= 0 && errorCheckEnd > errorCheckStart, "Accounting load results error guard must exist");
assert.ok(accountingSource.slice(errorCheckStart, errorCheckEnd).includes("allocationIntakesResult"), "allocation intake hydration errors must be propagated");
function mockClient(records, failOffset = null) {
  const requests = [];
  const client = { from(table) {
    const state = { table, columns: null, filters: [], orders: [] };
    const query = {
      select(columns) { state.columns = columns; return query; },
      eq(column, value) { state.filters.push([column, value]); return query; },
      order(column, options) { state.orders.push([column, options]); return query; },
      range(from, to) {
        requests.push({ ...state, filters: state.filters.slice(), orders: state.orders.slice(), from, to });
        if (from === failOffset) return Promise.resolve({ data: null, error: new Error("page failure") });
        const workspace = state.filters.find(([key]) => key === "condominiums.workspace_id")?.[1];
        const filtered = records.filter(row => workspace == null || row.condominiums.workspace_id === workspace);
        filtered.sort((a,b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
        return Promise.resolve({ data: filtered.slice(from,to+1), error: null });
      }
    }; return query;
  }};
  return { client, requests };
}
const rows=Array.from({length:1001},(_,i)=>({id:"m"+String(i).padStart(4,"0"),created_at:"2026-01-01",condominiums:{workspace_id:"ws-a"}}));
rows.push({id:"foreign",created_at:"2026-01-01",condominiums:{workspace_id:"ws-b"}});
const scoped=mockClient(rows);
const result=await loadAccountingCondominiumMembers(scoped.client,"ws-a");
assert.equal(result.data.length,1001);
assert.ok(result.data.every(row=>row.condominiums.workspace_id==="ws-a"));
assert.deepEqual(scoped.requests.map(r=>[r.from,r.to]),[[0,999],[1000,1999]]);
assert.ok(scoped.requests.every(r=>r.filters.some(([k,v])=>k==="condominiums.workspace_id"&&v==="ws-a")));
assert.deepEqual(scoped.requests[0].orders,[["created_at",{ascending:true}],["id",{ascending:true}]]);
const failed=mockClient(rows,1000);
await assert.rejects(loadAccountingCondominiumMembers(failed.client,"ws-a"),/page failure/);
await assert.rejects(loadAccountingCondominiumMembers(scoped.client,""),/Workspace non disponibile/);
await assert.rejects(loadAccountingCondominiumMembers(null,"ws-a"),/Client Supabase non disponibile/);
console.log("Accounting condominium member workspace scope + pagination: PASS");

// Fail closed when a successful query returns malformed pagination data.
// The old loader silently converted data:null/error:null into an empty member list
// and threw an opaque TypeError for non-array objects; oversized/duplicate/foreign
// rows could also be accepted without validation.
function malformedPageClient(data) {
  const calls = [];
  const client = { from(table) {
    const query = {
      select() { return query; },
      eq() { return query; },
      order() { return query; },
      range(from, to) {
        calls.push({ table, from, to });
        return Promise.resolve({ data, error: null });
      },
    };
    return query;
  }};
  return { client, calls };
}
const validMalformedTestRow = { id: "member-1", created_at: "2026-01-01", condominiums: { workspace_id: "ws-a" } };
const malformedPages = [
  ["null-data", null],
  ["object-data", { id: "member-1" }],
  ["oversized-page", Array.from({ length: 1001 }, (_, i) => ({ id: "member-" + i, condominiums: { workspace_id: "ws-a" } }))],
  ["duplicate-id", [validMalformedTestRow, { ...validMalformedTestRow }]],
  ["foreign-workspace", [{ ...validMalformedTestRow, condominiums: { workspace_id: "ws-b" } }]],
];
for (const [scenario, page] of malformedPages) {
  const malformed = malformedPageClient(page);
  await assert.rejects(
    loadAccountingCondominiumMembers(malformed.client, "ws-a"),
    /invalid page/i,
    scenario + " must be rejected",
  );
  assert.equal(malformed.calls.length, 1, scenario + " must fail before requesting another page");
}
console.log("Accounting member pagination malformed-response runtime guard: PASS");
