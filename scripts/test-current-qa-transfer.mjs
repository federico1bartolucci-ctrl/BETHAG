import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url="https://jhuyhlzzydcgghrzeexn.supabase.co",key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminPassword=process.env.BETHAG_QA_ADMIN_PASSWORD,residentPassword=process.env.BETHAG_QA_RESIDENT_PASSWORD,serviceKey=process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key&&adminPassword&&residentPassword&&serviceKey,"QA credentials missing");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const resident=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const cleanup=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const a=await admin.auth.signInWithPassword({email:"bethag-admin-qa@example.com",password:adminPassword});assert.ifError(a.error);
const r=await resident.auth.signInWithPassword({email:"bethag-condomino-qa@example.com",password:residentPassword});assert.ifError(r.error);
const marker="BETHAG_QA_TRANSFER_"+Date.now();
let condominiumId,unit1Id,unit2Id,owner1Id,owner2Id,fiscalYearId,installmentId,transfer1Id,transfer2Id;
const results=[];
try{
 const w=await admin.from("workspaces").select("id").eq("name","BETHAG_QA_FIXTURE_20261102").single();assert.ifError(w.error);
 const condo=await admin.from("condominiums").insert({workspace_id:w.data.id,name:marker,address:"Via QA Subentro 1",city:"Imola",postal_code:"40026",province:"BO",data:{bethag_qa_marker:marker}}).select("id").single();assert.ifError(condo.error);condominiumId=condo.data.id;
 const units=await admin.from("condominium_units").insert([
  {workspace_id:w.data.id,condominium_id:condominiumId,unit_code:"T-01",data:{unitType:"Abitazione",millesimi:"500",active:true,ownerMode:"condominium_member",ownerMemberIds:[]}},
  {workspace_id:w.data.id,condominium_id:condominiumId,unit_code:"T-02",data:{unitType:"Abitazione",millesimi:"500",active:true,ownerMode:"condominium_member",ownerMemberIds:[]}}
 ]).select("id,unit_code");assert.ifError(units.error);unit1Id=units.data.find(x=>x.unit_code==="T-01").id;unit2Id=units.data.find(x=>x.unit_code==="T-02").id;
 const members=await admin.from("condominium_members").insert([
  {condominium_id:condominiumId,name:"Proprietario Uscente QA 1",email:"outgoing1-"+Date.now()+"@example.com",role:"resident",active:true,legacy_id:Date.now(),unit_id:unit1Id,data:{role:"Proprietario",ownership_share:100,current_owner:true,position_status:"Attivo"}},
  {condominium_id:condominiumId,name:"Proprietario Uscente QA 2",email:"outgoing2-"+Date.now()+"@example.com",role:"resident",active:true,legacy_id:Date.now()+1,unit_id:unit2Id,data:{role:"Proprietario",ownership_share:100,current_owner:true,position_status:"Attivo"}}
 ]).select("id,unit_id");assert.ifError(members.error);owner1Id=members.data.find(x=>x.unit_id===unit1Id).id;owner2Id=members.data.find(x=>x.unit_id===unit2Id).id;
 const preview=await admin.rpc("preview_condominium_member_transfer",{p_unit_id:unit1Id,p_outgoing_member_id:owner1Id,p_transfer_date:"2026-11-02"});assert.ifError(preview.error);assert.equal(Number(preview.data.outstanding_total),0);
 const confirmed=await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:unit1Id,p_outgoing_member_id:owner1Id,p_incoming_name:"Nuovo Proprietario QA 1",p_incoming_email:"incoming1-"+Date.now()+"@example.com",p_incoming_user_id:null,p_transfer_date:"2026-11-02",p_transfer_type:"Vendita",p_notes:marker,p_data:{transfer_scope:"whole_property",incoming_members:[{name:"Nuovo Proprietario QA 1",email:"incoming1-"+Date.now()+"@example.com",ownership_share:100}]}});
 assert.ifError(confirmed.error);transfer1Id=confirmed.data;
 const residentClose=await resident.rpc("close_condominium_member_transfer",{p_transfer_id:transfer1Id});assert.ok(residentClose.error&&residentClose.error.message.includes("FORBIDDEN"),"Resident unexpectedly closed a member transfer");
 const closed=await admin.rpc("close_condominium_member_transfer",{p_transfer_id:transfer1Id});assert.ifError(closed.error);assert.equal(closed.data,true);
 const t1=await admin.from("condominium_member_transfers").select("status").eq("id",transfer1Id).single();assert.ifError(t1.error);assert.equal(t1.data.status,"Chiuso");
 const outgoing1=await admin.from("condominium_members").select("active,data").eq("id",owner1Id).single();assert.ifError(outgoing1.error);assert.equal(outgoing1.data.active,false);assert.equal(outgoing1.data.data.current_owner,false);
 const incoming1=await admin.from("condominium_members").select("active,data").eq("unit_id",unit1Id).neq("id",owner1Id).single();assert.ifError(incoming1.error);assert.equal(incoming1.data.active,true);assert.equal(incoming1.data.data.current_owner,true);
 results.push({name:"APP-08/11 valid transfer closure and role authorization",status:"PASS",detail:"preview + confirmation + closure succeeded; resident close denied; outgoing owner archived and incoming owner active"});

 const fy=await admin.from("condominium_fiscal_years").insert({workspace_id:w.data.id,condominium_id:condominiumId,name:"Esercizio subentro QA",start_date:"2026-01-01",end_date:"2026-12-31",status:"Aperto",opening_balance:0,notes:marker}).select("id").single();assert.ifError(fy.error);fiscalYearId=fy.data.id;
 const ins=await admin.from("condominium_installments").insert({workspace_id:w.data.id,condominium_id:condominiumId,fiscal_year_id:fiscalYearId,member_id:owner2Id,unit_id:unit2Id,title:"Rata insoluta QA",due_date:"2026-11-15",amount:90,paid_amount:0,status:"Da pagare",notes:marker}).select("id").single();assert.ifError(ins.error);installmentId=ins.data.id;
 const confirm2=await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:unit2Id,p_outgoing_member_id:owner2Id,p_incoming_name:"Nuovo Proprietario QA 2",p_incoming_email:"incoming2-"+Date.now()+"@example.com",p_incoming_user_id:null,p_transfer_date:"2026-11-02",p_transfer_type:"Vendita",p_notes:marker,p_data:{transfer_scope:"whole_property",incoming_members:[{name:"Nuovo Proprietario QA 2",email:"incoming2-"+Date.now()+"@example.com",ownership_share:100}]}});
 assert.ifError(confirm2.error);transfer2Id=confirm2.data;
 const denied=await admin.rpc("close_condominium_member_transfer",{p_transfer_id:transfer2Id});assert.ok(denied.error&&denied.error.message.includes("TRANSFER_FINANCIAL_POSITIONS_OPEN"),"Transfer with unpaid installment unexpectedly closed");
 const stillOpen=await admin.from("condominium_member_transfers").select("status").eq("id",transfer2Id).single();assert.ifError(stillOpen.error);assert.equal(stillOpen.data.status,"Confermato");
 const outgoing2=await admin.from("condominium_members").select("active,data").eq("id",owner2Id).single();assert.ifError(outgoing2.error);assert.equal(outgoing2.data.active,true);assert.equal(outgoing2.data.data.position_status,"In chiusura");
 results.push({name:"APP-09 unpaid installment prevents transfer closure",status:"PASS",detail:"€90 unpaid installment blocked closure; transfer remained Confermato and outgoing member remained active/in chiusura"});
}finally{
 if(transfer2Id) { const x=await cleanup.from("condominium_member_transfers").delete().eq("id",transfer2Id);assert.ifError(x.error); }
 if(transfer1Id) { const x=await cleanup.from("condominium_member_transfers").delete().eq("id",transfer1Id);assert.ifError(x.error); }
 if(installmentId) { const x=await cleanup.from("condominium_installments").delete().eq("id",installmentId);assert.ifError(x.error); }
 if(fiscalYearId) { const x=await cleanup.from("condominium_fiscal_years").delete().eq("id",fiscalYearId);assert.ifError(x.error); }
 if(condominiumId) {
  const m=await cleanup.from("condominium_members").delete().eq("condominium_id",condominiumId);assert.ifError(m.error);
  const u=await cleanup.from("condominium_units").delete().eq("condominium_id",condominiumId);assert.ifError(u.error);
  const c=await cleanup.from("condominiums").delete().eq("id",condominiumId);assert.ifError(c.error);
 }
 await resident.auth.signOut();await admin.auth.signOut();
}
console.log(JSON.stringify({suite:"BETHAG_QA_APP08_09_11",target:"jhuyhlzzydcgghrzeexn",results,cleanup:"service-role fixture cleanup completed"},null,2));
