import assert from "node:assert/strict";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

const records=[
  {id:"doc-a",workspace_id:"ws-1",work_id:"work-1",created_at:"2026-01-01",name:"A"},
  {id:"doc-b",workspace_id:"ws-1",work_id:"work-2",created_at:"2026-01-02",name:"B"},
  {id:"doc-c",workspace_id:"ws-2",work_id:"work-1",created_at:"2026-01-03",name:"C"},
];
const calls=[];
const client={from(table){const state={table,select:null,eqs:[],orders:[]};const q={
 select(columns){state.select=columns;return q;},
 eq(column,value){state.eqs.push([column,value]);return q;},
 is(column,value){state.eqs.push([column,value]);return q;},
 order(column,opts){state.orders.push([column,opts]);return q;},
 or(){return q;},gt(){return q;},
 range(from,to){calls.push(state);const rows=records.filter(row=>state.eqs.every(([key,val])=>row[key]===val)).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))).slice(from,to+1);const projected=state.select==="*" ? rows : rows.map(row=>Object.fromEntries(state.select.split(",").map(k=>k.trim()).filter(k=>k in row).map(k=>[k,row[k]])));return Promise.resolve({data:projected,error:null});}
};return q;}};
const result=await loadWorkspacePaginatedRows(client,"condominium_work_documents","ws-1",{filters:{work_id:"work-1"},pageSize:10,select:"id,created_at"});
assert.equal(result.data.length,1);
assert.equal(result.data[0].id,"doc-a");
assert.deepEqual(Object.keys(result.data[0]).sort(),["created_at","id"]);
assert.ok(calls[0].eqs.some(([column,value])=>column==="work_id"&&value==="work-1"));
assert.ok(calls[0].eqs.some(([column,value])=>column==="workspace_id"&&value==="ws-1"));
console.log("PASS: workspace pagination filters and selected cursor columns runtime guard.");
