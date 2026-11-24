import assert from "node:assert/strict";
import { loadWorkspacePaginatedRows } from "../src/lib/workspacePagination.mjs";

const rows = [
  ...Array.from({length: 1001}, (_, i) => ({id:`doc-${String(i).padStart(4,"0")}`,workspace_id:"ws-1",work_id:"work-1",created_at:"2026-01-01"})),
  {id:"other-1",workspace_id:"ws-1",work_id:"work-2",created_at:"2026-01-02"},
  {id:"foreign-1",workspace_id:"ws-2",work_id:"work-1",created_at:"2026-01-03"},
];
const calls=[];
const client={from(table){
  const state={filters:[],orders:[],cursor:null,nullCursor:false,idGt:null};
  const q={
    select(v){state.select=v;return q;},
    eq(k,v){state.filters.push([k,v]);return q;},
    order(k,v){state.orders.push([k,v]);return q;},
    or(v){state.cursor=v;return q;},
    is(k,v){state.nullCursor=[k,v];return q;},
    gt(k,v){state.idGt=[k,v];return q;},
    range(from,to){
      calls.push({table,filters:[...state.filters],cursor:state.cursor,from,to});
      let found=rows.filter(r=>state.filters.every(([k,v])=>r[k]===v));
      if(state.cursor){
        const m=state.cursor.match(/^created_at\\.gt\\.(.*?),and\\(created_at\\.eq\\.(.*?),id\\.gt\\.(.*?)\\),created_at\\.is\\.null$/);
        assert.ok(m,"keyset cursor must include value, ID tie-break and NULL tail");
        found=found.filter(r=>r.created_at===null||r.created_at>m[1]||(r.created_at===m[2]&&r.id>m[3]));
      }
      found.sort((a,b)=>String(a.created_at??"9999").localeCompare(String(b.created_at??"9999"))||a.id.localeCompare(b.id));
      return Promise.resolve({data:found.slice(from,to+1).map(r=>state.select==="id,created_at"?{id:r.id,created_at:r.created_at}:r),error:null});
    }
  };return q;
}};
const result=await loadWorkspacePaginatedRows(client,"condominium_work_documents","ws-1",{filters:{work_id:"work-1"},select:"id,created_at",pageSize:1000});
assert.equal(result.data.length,1001);
assert.ok(result.data.every(r=>r.id.startsWith("doc-")));
assert.deepEqual(calls.map(c=>[c.from,c.to]),[[0,999],[0,999]]);
assert.ok(calls.every(c=>c.filters.some(([k,v])=>k==="workspace_id"&&v==="ws-1")&&c.filters.some(([k,v])=>k==="work_id"&&v==="work-1")));
await assert.rejects(loadWorkspacePaginatedRows(client,"x","ws-1",{filters:{work_id:null}}),/Valore filtro workspace non valido/);
await assert.rejects(loadWorkspacePaginatedRows(client,"x","ws-1",{filters:{workspace_id:"ws-2"}}),/Filtro workspace duplicato/);
console.log("PASS: workspace pagination filters, isolation, 1,001-row keyset pagination and validation.");
