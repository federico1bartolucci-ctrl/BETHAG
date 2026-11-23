import assert from "node:assert/strict";
import { fetchRegisterSuppliers } from "../src/lib/register-suppliers-pagination.mjs";
function mockClient(pages) {
 const calls=[];
 return {calls,from(table){const call={table,filters:[],orders:[],range:null};return {
  select(columns){call.columns=columns;return this;},
  eq(column,value){call.filters.push([column,value]);return this;},
  order(column,options){call.orders.push([column,options]);return this;},
  range(from,to){call.range=[from,to];calls.push(call);return Promise.resolve(pages[calls.length-1]??{data:[],error:null});}
 };}};
}
const rows=Array.from({length:1002},(_,i)=>({id:"sup-"+i,business_name:"Supplier "+i,workspace_id:"ws"}));
const client=mockClient([{data:rows.slice(0,1000),error:null},{data:rows.slice(1000),error:null}]);
const result=await fetchRegisterSuppliers(client,"ws");
assert.equal(result.length,1002);
assert.equal(result[1001].id,"sup-1001");
assert.deepEqual(client.calls.map(x=>x.range),[[0,999],[1000,1999]]);
for(const call of client.calls){assert.equal(call.table,"condominium_suppliers");assert.deepEqual(call.filters,[["workspace_id","ws"]]);assert.deepEqual(call.orders.map(x=>x[0]),["business_name","id"]);}
const failed=mockClient([{data:rows.slice(0,1000),error:null},{data:null,error:new Error("second page unavailable")}]);
await assert.rejects(()=>fetchRegisterSuppliers(failed,"ws"),/second page unavailable/);
assert.equal(failed.calls.length,2);
const empty=mockClient([{data:[],error:null}]);
assert.deepEqual(await fetchRegisterSuppliers(empty,"ws"),[]);
assert.equal(empty.calls.length,1);
await assert.rejects(()=>fetchRegisterSuppliers(mockClient([]),"ws",0),RangeError);
const source=await (await import("node:fs/promises")).readFile("src/RegisterPage.tsx","utf8");
assert.match(source,/fetchRegisterSuppliers\(supabase,workspaceId\)/);
console.log("PASS: Register suppliers pagination.");
