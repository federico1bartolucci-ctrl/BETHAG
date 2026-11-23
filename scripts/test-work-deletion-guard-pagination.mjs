import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadCondominiumWorkDeletionRows } from "../src/lib/workDeletionGuardPagination.mjs";

const CAP = 1000;
function makeClient(rowsByTable, { failTable = null, failPage = null } = {}) {
  const calls = [];
  const counts = new Map();
  const client = { from(table) {
    const state = { table, eq: [], in: [], order: null, cursor: null, range: null, pageNo: 0 };
    const q = {
      select(columns) { state.columns = columns; return q; },
      eq(column, value) { state.eq.push([column, value]); return q; },
      in(column, values) { state.in.push([column, [...values]]); return q; },
      order(column, options) { state.order = [column, options]; return q; },
      gt(column, value) { state.cursor = [column, value]; return q; },
      range(from, to) { state.range = [from, to]; state.pageNo = (counts.get(table) ?? 0) + 1; counts.set(table, state.pageNo); calls.push({...state, eq:[...state.eq], in:state.in.map(([c,v])=>[c,[...v]])}); return q; },
      then(resolve, reject) {
        let rows=(rowsByTable[table]??[]).filter(row=>state.eq.every(([c,v])=>row[c]===v)&&state.in.every(([c,values])=>values.includes(row[c]))&&(!state.cursor||String(row[state.cursor[0]])>String(state.cursor[1])));
        if(state.order) rows=rows.slice().sort((a,b)=>String(a[state.order[0]]).localeCompare(String(b[state.order[0]])));
        const [from,to]=state.range??[0,CAP-1];
        const page=rows.slice(from,to+1);
        const error=state.range&&table===failTable&&state.pageNo===failPage?new Error("simulated later-page failure"):null;
        return Promise.resolve({data:error?null:page,error}).then(resolve,reject);
      }
    };return q;
  }};
  return {client,calls};
}
const wid="ws-1", work="work-1";
const mk=(prefix,n)=>prefix+String(n).padStart(4,"0");
const links=Array.from({length:1001},(_,i)=>({id:mk("link-",i),workspace_id:wid,work_id:work,document_id:i+1}));
const docs=Array.from({length:1001},(_,i)=>({id:mk("doc-",i),workspace_id:wid,legacy_id:i+1,category:i===1000?"Fattura":"Allegato",data:i===1000?{invoiceConfirmation:{status:"Confermato"}}:{}}));
docs.push({id:"foreign-doc",workspace_id:"ws-2",legacy_id:1001,category:"Fattura",data:{invoiceConfirmation:{status:"Confermato"}}});

// Baseline capped reads reproduce the false-negative invoice guard.
{
 const {client}=makeClient({condominium_work_documents:links,documents:docs});
 const legacyLinks=await client.from("condominium_work_documents").select("document_id").eq("workspace_id",wid).eq("work_id",work);
 assert.equal(legacyLinks.data.length,1000);
 const ids=legacyLinks.data.map(row=>row.document_id);
 const legacyDocs=await client.from("documents").select("legacy_id,category,data").eq("workspace_id",wid).in("legacy_id",ids);
 assert.equal(legacyDocs.data.length,1000);
 assert.equal(legacyDocs.data.some(doc=>doc.legacy_id===1001&&doc.category==="Fattura"),false);
}

// Fixed loader recovers every link and document; last invoice blocks deletion.
{
 const {client,calls}=makeClient({condominium_work_documents:links,documents:docs});
 const allLinks=await loadCondominiumWorkDeletionRows(client,"condominium_work_documents",wid,work,{select:"id,document_id",pageSize:250});
 assert.equal(allLinks.length,1001);
 const legacyIds=Array.from(new Set(allLinks.map(row=>row.document_id)));
 const allDocs=await loadCondominiumWorkDeletionRows(client,"documents",wid,work,{legacyIds,select:"id,legacy_id,category,data",pageSize:250,legacyIdBatchSize:500});
 assert.equal(allDocs.length,1001);
 assert.equal(allDocs.filter(doc=>doc.category==="Fattura"||doc.data?.invoiceConfirmation?.status==="Confermato").length,1);
 assert.ok(calls.every(call=>call.eq.some(([c,v])=>c==="workspace_id"&&v===wid)));
 assert.ok(calls.filter(call=>call.table==="documents").every(call=>call.in.every(([c,values])=>c==="legacy_id"&&values.length<=500)));
 assert.ok(calls.filter(call=>call.table==="condominium_work_documents").every(call=>call.eq.some(([c,v])=>c==="work_id"&&v===work)));
}

// Any later-page failure aborts the guard instead of authorizing deletion from partial data.
{
 const {client,calls}=makeClient({condominium_work_documents:links},{failTable:"condominium_work_documents",failPage:2});
 await assert.rejects(loadCondominiumWorkDeletionRows(client,"condominium_work_documents",wid,work,{select:"id,document_id",pageSize:250}),/simulated later-page failure/);
 assert.equal(calls.length,2);
}

// Production function must use the paginated loader for progress, links and invoice documents.
{
 const backend=await readFile(new URL("../src/lib/bethagBackend.ts",import.meta.url),"utf8");
 const packageJson=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
 assert.match(backend,/import\s*\{\s*loadCondominiumWorkDeletionRows\s*\}\s*from\s*["']\.\/workDeletionGuardPagination\.mjs["']/);
 const start=backend.indexOf("export async function deleteCondominiumWork(");
 const end=backend.indexOf("\nexport async function ",start+40);
 assert.ok(start>=0&&end>start);
 const fn=backend.slice(start,end);
 for(const table of ["condominium_work_progress","condominium_work_documents","documents"]) assert.match(fn,new RegExp("loadCondominiumWorkDeletionRows\\(\\s*supabase\\s*,\\s*['\"]"+table+"['\"]"),table+" must be paginated");
 assert.doesNotMatch(fn,/\.from\(["'](?:condominium_work_progress|condominium_work_documents|documents)["']\)/);
 assert.match(packageJson.scripts.test,/test-work-deletion-guard-pagination\.mjs/);
}
console.log("PASS work deletion guard pagination: baseline false-negative reproduced; 1,001 links/documents recovered; invoice detected; page failures abort; production wiring verified.");
