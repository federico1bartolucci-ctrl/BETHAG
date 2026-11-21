import assert from "node:assert/strict";
import { loadAccountingLedgerRows } from "../src/lib/accountingLedgerPagination.ts";
function mockClient(pages, failOffset = null) {
 const calls=[];
 const client={from(table){const q={select(columns){calls.push({table,columns});return q;},eq(column,value){calls.at(-1).workspaceFilter=[column,value];return q;},order(column,options){calls.at(-1).orders??=[];calls.at(-1).orders.push([column,options]);return q;},range(from,to){calls.at(-1).range=[from,to];return Promise.resolve(from===failOffset?{data:null,error:new Error("page failure")}:{data:pages.get(from)??[],error:null});}};return q;}};
 return {client,calls};
}
const first=Array.from({length:1000},(_,i)=>({id:"entry-"+i})),second=[{id:"entry-1000"}];
const {client,calls}=mockClient(new Map([[0,first],[1000,second]]));
const rows=await loadAccountingLedgerRows(client,"workspace-x");
assert.equal(rows.length,1001);assert.deepEqual(calls.map(c=>c.range),[[0,999],[1000,1999]]);
assert.equal(calls[0].table,"condominium_ledger_entries");assert.deepEqual(calls[0].workspaceFilter,["workspace_id","workspace-x"]);
assert.deepEqual(calls[0].orders,[["entry_date",{ascending:false}],["id",{ascending:true}]]);
const failed=mockClient(new Map([[0,first]]),1000);await assert.rejects(loadAccountingLedgerRows(failed.client,"workspace-x"),/page failure/);
console.log("Accounting ledger pagination regression checks passed.");
