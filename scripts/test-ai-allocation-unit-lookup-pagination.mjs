import assert from "node:assert/strict";
import { fetchAllocationUnitsByCondominium } from "../src/lib/allocation-unit-lookup-pagination.mjs";

function mockClient(pages) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, select: null, filters: [], orders: [], range: null };
      return {
        select(columns) { call.select = columns; return this; },
        eq(column, value) { call.filters.push([column, value]); return this; },
        order(column, options) { call.orders.push([column, options]); return this; },
        range(from, to) {
          call.range = [from, to];
          calls.push(call);
          return Promise.resolve(pages[calls.length - 1] ?? { data: [], error: null });
        },
      };
    },
  };
}
const rows=Array.from({length:1001},(_,i)=>({id:"unit-"+i,unit_code:"U-"+i,data:{}}));
const client=mockClient([{data:rows.slice(0,1000),error:null},{data:rows.slice(1000),error:null}]);
const result=await fetchAllocationUnitsByCondominium(client,"ws","condo");
assert.equal(result.length,1001);
assert.equal(result[1000].id,"unit-1000");
assert.deepEqual(client.calls.map(x=>x.range),[[0,999],[1000,1999]]);
for(const call of client.calls){
 assert.equal(call.table,"condominium_units");
 assert.deepEqual(call.filters,[["workspace_id","ws"],["condominium_id","condo"]]);
 assert.deepEqual(call.orders.map(x=>x[0]),["unit_code","id"]);
}
const failed=mockClient([{data:rows.slice(0,1000),error:null},{data:null,error:new Error("page read failed")}]);
await assert.rejects(()=>fetchAllocationUnitsByCondominium(failed,"ws","condo"),/page read failed/);
assert.equal(failed.calls.length,2);
const empty=mockClient([{data:[],error:null}]);
assert.deepEqual(await fetchAllocationUnitsByCondominium(empty,"ws","condo"),[]);
assert.equal(empty.calls.length,1);
await assert.rejects(()=>fetchAllocationUnitsByCondominium(mockClient([]),"ws","condo",0),RangeError);
const source=await (await import("node:fs/promises")).readFile("src/main.tsx","utf8");
assert.match(source,/fetchAllocationUnitsByCondominium\(supabase, workspaceId, condominium\.id\)/);
console.log("PASS: AI allocation condominium-unit lookup pagination.");
