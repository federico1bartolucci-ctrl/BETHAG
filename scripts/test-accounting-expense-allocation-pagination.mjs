import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceExpenseAllocations } from "../src/lib/accountingExpenseAllocationPagination.ts";
const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(source, /loadWorkspaceExpenseAllocations\(supabase, workspaceId\)/);
assert.ok(packageJson.scripts.test.includes("test-accounting-expense-allocation-pagination.mjs"));
function mockClient(pages, failOffset = null) {
 const requests=[]; const client={from(table){const state={table,workspaceId:null,orders:[]};const query={select(){return query;},eq(c,v){if(c==="workspace_id")state.workspaceId=v;return query;},order(c,o){state.orders.push([c,o]);return query;},range(from,to){requests.push({...state,orders:state.orders.slice(),from,to});if(from===failOffset)return Promise.resolve({data:null,error:new Error("page failure")});return Promise.resolve({data:pages.get(from)??[],error:null});}};return query;}};return {client,requests};}
const first=Array.from({length:1000},(_,i)=>({id:"allocation-"+i,due_date:"2026-01-01"})),second=[{id:"allocation-1000",due_date:"2026-01-02"}];
const {client,requests}=mockClient(new Map([[0,first],[1000,second]]));
const result=await loadWorkspaceExpenseAllocations(client,"workspace-a");
assert.equal(result.data.length,1001);
assert.deepEqual(requests.map(({from,to})=>[from,to]),[[0,999],[1000,1999]]);
assert.equal(requests[0].table,"condominium_expense_allocations");assert.equal(requests[0].workspaceId,"workspace-a");
assert.deepEqual(requests[0].orders,[["due_date",{ascending:true}],["id",{ascending:true}]]);
const failing=mockClient(new Map([[0,first],[1000,second]]),1000);
await assert.rejects(loadWorkspaceExpenseAllocations(failing.client,"workspace-a"),/page failure/);
console.log("Accounting expense-allocation pagination regression checks passed.");
