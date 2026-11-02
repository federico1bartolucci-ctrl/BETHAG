import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url="https://jhuyhlzzydcgghrzeexn.supabase.co", key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const password=process.env.BETHAG_QA_ADMIN_PASSWORD;
const serviceKey=process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key&&password&&serviceKey,"QA key/password/service cleanup key missing");
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const cleanup=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await db.auth.signInWithPassword({email:"bethag-admin-qa@example.com",password});
assert.ifError(login.error);
const marker="BETHAG_QA_APP05_07_"+Date.now();
const workspaceName="BETHAG_QA_FIXTURE_20261102";
const out=[];
const pass=(name,detail)=>out.push({name,status:"PASS",detail});
let condominiumId,unitId,fiscalYearId,ledgerId,allocationId,installmentId;
try{
 const w=await db.from("workspaces").select("id").eq("name",workspaceName).single();assert.ifError(w.error);
 const condo=await db.from("condominiums").insert({workspace_id:w.data.id,name:marker,address:"Via QA 1",city:"Imola",postal_code:"40026",province:"BO",data:{bethag_qa_marker:marker}}).select("id").single();assert.ifError(condo.error);condominiumId=condo.data.id;
 const unit=await db.from("condominium_units").insert({workspace_id:w.data.id,condominium_id:condominiumId,unit_code:"QA-A01",building_code:"A",data:{unitType:"Abitazione",millesimi:"1000",active:true,ownerMode:"condominium_member",ownerMemberIds:[],notes:marker}}).select("id").single();assert.ifError(unit.error);unitId=unit.data.id;
 const upd=await db.from("condominiums").update({address:"Via QA 2"}).eq("id",condominiumId).eq("workspace_id",w.data.id);assert.ifError(upd.error);
 const reloaded=await db.from("condominiums").select("name,address").eq("id",condominiumId).single();assert.ifError(reloaded.error);assert.equal(reloaded.data.address,"Via QA 2");
 const unitReload=await db.from("condominium_units").select("unit_code,building_code").eq("id",unitId).single();assert.ifError(unitReload.error);assert.equal(unitReload.data.unit_code,"QA-A01");
 pass("APP-05 create/edit condominium and hierarchical unit","real administrator session; condominium and unit persisted and reread");

 const fy=await db.from("condominium_fiscal_years").insert({workspace_id:w.data.id,condominium_id:condominiumId,name:"Esercizio QA",start_date:"2026-01-01",end_date:"2026-12-31",status:"Aperto",opening_balance:0,notes:marker}).select("id").single();assert.ifError(fy.error);fiscalYearId=fy.data.id;
 const le=await db.from("condominium_ledger_entries").insert({workspace_id:w.data.id,condominium_id:condominiumId,fiscal_year_id:fiscalYearId,entry_date:"2026-11-02",direction:"Uscita",category:"Manutenzione QA",description:marker,amount:125.5,payment_status:"Da pagare",notes:marker,expense_type:"Ordinaria"}).select("id").single();assert.ifError(le.error);ledgerId=le.data.id;
 const al=await db.from("condominium_expense_allocations").insert({workspace_id:w.data.id,condominium_id:condominiumId,ledger_entry_id:ledgerId,unit_id:unitId,allocation_basis:"Millesimi",millesimi:1000,amount:125.5,paid_amount:0,status:"Da pagare",notes:marker}).select("id").single();assert.ifError(al.error);allocationId=al.data.id;
 const ins=await db.from("condominium_installments").insert({workspace_id:w.data.id,condominium_id:condominiumId,fiscal_year_id:fiscalYearId,unit_id:unitId,title:"Rata QA",due_date:"2026-12-01",amount:125.5,paid_amount:0,status:"Da pagare",notes:marker}).select("id").single();assert.ifError(ins.error);installmentId=ins.data.id;
 const verify=await db.from("condominium_ledger_entries").select("amount").eq("id",ledgerId).single();assert.ifError(verify.error);assert.equal(Number(verify.data.amount),125.5);
 const verifyAlloc=await db.from("condominium_expense_allocations").select("amount,millesimi").eq("id",allocationId).single();assert.ifError(verifyAlloc.error);assert.equal(Number(verifyAlloc.data.amount),125.5);assert.equal(Number(verifyAlloc.data.millesimi),1000);
 const verifyInst=await db.from("condominium_installments").select("amount").eq("id",installmentId).single();assert.ifError(verifyInst.error);assert.equal(Number(verifyInst.data.amount),125.5);
 pass("APP-06 accounting expense/allocation/installment persistence","real administrator session; €125.50 expense, 1,000 millesimi allocation and installment persisted");

 const paid=await db.from("condominium_installments").update({paid_amount:125.5,status:"Pagato"}).eq("id",installmentId);assert.ifError(paid.error);
 const close=await db.rpc("close_fiscal_year_and_generate_carryovers",{p_workspace_id:w.data.id,p_condominium_id:condominiumId,p_source_fiscal_year_id:fiscalYearId});assert.ifError(close.error);
 const blocked=await db.from("condominium_ledger_entries").update({amount:126}).eq("id",ledgerId);
 assert.ok(blocked.error,"Closed fiscal period accepted ledger mutation");
 const unchanged=await db.from("condominium_ledger_entries").select("amount").eq("id",ledgerId).single();assert.ifError(unchanged.error);assert.equal(Number(unchanged.data.amount),125.5);
 pass("APP-07 closed accounting period guard","database rejected ledger change; original amount remained €125.50");
} finally {
 if(installmentId) await cleanup.from("condominium_installments").delete().eq("id",installmentId);
 if(allocationId) await cleanup.from("condominium_expense_allocations").delete().eq("id",allocationId);
 if(ledgerId) await cleanup.from("condominium_ledger_entries").delete().eq("id",ledgerId);
 if(fiscalYearId) await cleanup.from("condominium_fiscal_years").delete().eq("id",fiscalYearId);
 if(unitId) await cleanup.from("condominium_units").delete().eq("id",unitId);
 if(condominiumId) await cleanup.from("condominiums").delete().eq("id",condominiumId);
 await db.auth.signOut();
}
console.log(JSON.stringify({suite:"BETHAG_QA_APP05_07",target:"jhuyhlzzydcgghrzeexn",results:out,cleanup:"attempted for all marker rows"},null,2));
