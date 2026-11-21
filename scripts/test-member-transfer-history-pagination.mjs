import assert from "node:assert/strict";
import { loadMemberTransferHistory } from "../src/lib/memberTransferHistoryPagination.ts";
function mockClient(pages, failOffset = null) {
 const calls=[];
 const client={from(table){const state={table,select:null,filters:[],orders:[]};const query={
 select(columns){state.select=columns;return query;},
 eq(column,value){state.filters.push([column,value]);return query;},
 order(column,options){state.orders.push([column,options]);return query;},
 range(from,to){calls.push({...state,filters:[...state.filters],orders:[...state.orders],from,to});return Promise.resolve(from===failOffset?{data:null,error:new Error("page failure")}:{data:pages.get(from)??[],error:null});}
 };return query;}};
 return {client,calls};
}
const first=Array.from({length:1000},(_,i)=>({id:"transfer-"+i}));
const second=[{id:"transfer-1000"}];
const {client,calls}=mockClient(new Map([[0,first],[1000,second]]));
const rows=await loadMemberTransferHistory(client,"workspace-a","condo-a");
assert.equal(rows.length,1001);
assert.deepEqual(calls.map(c=>[c.from,c.to]),[[0,999],[1000,1999]]);
assert.equal(calls[0].table,"condominium_member_transfers");
assert.deepEqual(calls[0].filters,[["workspace_id","workspace-a"],["condominium_id","condo-a"]]);
assert.deepEqual(calls[0].orders,[["transfer_date",{ascending:false}],["id",{ascending:true}]]);
const failed=mockClient(new Map([[0,first]]),1000);
await assert.rejects(loadMemberTransferHistory(failed.client,"workspace-a","condo-a"),/page failure/);
const empty=mockClient(new Map());
assert.deepEqual(await loadMemberTransferHistory(empty.client,"","condo-a"),[]);
assert.equal(empty.calls.length,0);
console.log("Member transfer history pagination regression passed.");
