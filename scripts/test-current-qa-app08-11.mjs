import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url="https://jhuyhlzzydcgghrzeexn.supabase.co",key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminPass=process.env.BETHAG_QA_ADMIN_PASSWORD,residentPass=process.env.BETHAG_QA_RESIDENT_PASSWORD,serviceKey=process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(key&&adminPass&&residentPass&&serviceKey,"QA credentials missing");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const resident=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const cleanup=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const a=await admin.auth.signInWithPassword({email:"bethag-admin-qa@example.com",password:adminPass});assert.ifError(a.error);
const r=await resident.auth.signInWithPassword({email:"bethag-condomino-qa@example.com",password:residentPass});assert.ifError(r.error);
const marker="BETHAG_QA_APP08_11_"+Date.now(), ids={condo:null,unit:null,old:null,transfer:null,openTransfer:null,openMember:null,openInstallment:null,unit2:null,owner2:null,fiscalYear:null,blockedTransfer:null,blockedInstallment:null};
const w=await admin.from("workspaces").select("id").eq("name","BETHAG_QA_FIXTURE_20261102").single();assert.ifError(w.error);
const must= (x,label)=>{assert.ifError(x.error);return x.data};
try{
 const condo=must(await admin.from("condominiums").insert({workspace_id:w.data.id,name:marker,address:"QA",data:{bethag_qa_marker:marker}}).select("id").single(),"condo");ids.condo=condo.id;
 const unit=must(await admin.from("condominium_units").insert({workspace_id:w.data.id,condominium_id:ids.condo,unit_code:"QA-T01",building_code:"A",data:{bethag_qa_marker:marker}}).select("id").single(),"unit");ids.unit=unit.id;
 const old=must(await admin.from("condominium_members").insert({condominium_id:ids.condo,unit_id:ids.unit,name:"Cedente QA",role:"resident",active:true,data:{role:"Proprietario",position_status:"Attivo",current_owner:true,ownership_share:100,bethag_qa_marker:marker}}).select("id").single(),"old owner");ids.old=old.id;
 const date1="2026-11-02";
 const preview=must(await admin.rpc("preview_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_transfer_date:date1}),"preview");
 assert.equal(preview.outgoing_member_id,ids.old);
 const forbidden=await resident.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_incoming_name:"Non autorizzato",p_incoming_email:null,p_incoming_user_id:null,p_transfer_date:"2026-11-03",p_transfer_type:"Vendita",p_notes:marker,p_data:{transfer_scope:"whole_property",incoming_members:[{name:"Non autorizzato",ownership_share:100}]}});
 assert.ok(forbidden.error,"Resident unexpectedly confirmed a transfer");
 const created=must(await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_incoming_name:"Acquirente QA",p_incoming_email:null,p_incoming_user_id:null,p_transfer_date:date1,p_transfer_type:"Vendita",p_notes:marker,p_data:{bethag_qa_marker:marker,transfer_scope:"whole_property",outgoing_member_ids:[ids.old],incoming_members:[{name:"Acquirente QA",ownership_share:100}]}}),"confirm transfer");
 ids.transfer=created;
 const oldState=must(await admin.from("condominium_members").select("active,data").eq("id",ids.old).single(),"old state");
 assert.equal(oldState.active,true);assert.equal(oldState.data.position_status,"In chiusura");assert.equal(oldState.data.current_owner,false);
 const snapshot=must(await admin.rpc("get_member_transfer_accounting_snapshot",{p_transfer_id:ids.transfer}),"accounting snapshot");
 assert.equal(snapshot.transfer.status,"Confermato");
 const closureCheck=must(await admin.rpc("check_condominium_member_transfer_closure",{p_transfer_id:ids.transfer}),"closure check");
 assert.equal(Number(closureCheck.open_total),0);
 const closed=must(await admin.rpc("close_condominium_member_transfer",{p_transfer_id:ids.transfer}),"close transfer");
 assert.equal(closed,true);
 const after=must(await admin.from("condominium_members").select("active,data").eq("id",ids.old).single(),"closed outgoing");
 assert.equal(after.active,false);assert.equal(after.data.position_status,"Archiviato");
 const transferAfter=must(await admin.from("condominium_member_transfers").select("status,closed_by").eq("id",ids.transfer).single(),"closed transfer state");
 assert.equal(transferAfter.status,"Chiuso");

 // APP-09/11: an unpaid installment must block the official close operation
 // without partially changing the transfer or either member's position.
 const unit2=must(await admin.from("condominium_units").insert({workspace_id:w.data.id,condominium_id:ids.condo,unit_code:"QA-T02",building_code:"A",data:{bethag_qa_marker:marker}}).select("id").single(),"financial blocker unit");ids.unit2=unit2.id;
 const owner2=must(await admin.from("condominium_members").insert({condominium_id:ids.condo,unit_id:ids.unit2,name:"Cedente QA insoluto",role:"resident",active:true,data:{role:"Proprietario",position_status:"Attivo",current_owner:true,ownership_share:100,bethag_qa_marker:marker}}).select("id").single(),"financial blocker owner");ids.owner2=owner2.id;
 const fiscalYear=must(await admin.from("condominium_fiscal_years").insert({workspace_id:w.data.id,condominium_id:ids.condo,name:"Esercizio insoluto QA "+marker,start_date:"2026-01-01",end_date:"2026-12-31",status:"Aperto",opening_balance:0,notes:marker}).select("id").single(),"financial blocker fiscal year");ids.fiscalYear=fiscalYear.id;
 const installment=must(await admin.from("condominium_installments").insert({workspace_id:w.data.id,condominium_id:ids.condo,fiscal_year_id:ids.fiscalYear,member_id:ids.owner2,unit_id:ids.unit2,title:"Rata insoluta QA",due_date:"2026-11-15",amount:90,paid_amount:0,status:"Da pagare",notes:marker}).select("id").single(),"financial blocker installment");ids.blockedInstallment=installment.id;
 const blocked=must(await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit2,p_outgoing_member_id:ids.owner2,p_incoming_name:"Acquirente QA insoluto",p_incoming_email:null,p_incoming_user_id:null,p_transfer_date:date1,p_transfer_type:"Vendita",p_notes:marker,p_data:{bethag_qa_marker:marker,transfer_scope:"whole_property",outgoing_member_ids:[ids.owner2],incoming_members:[{name:"Acquirente QA insoluto",ownership_share:100}]}}),"confirm blocked transfer");ids.blockedTransfer=blocked;
 const rejectedClose=await admin.rpc("close_condominium_member_transfer",{p_transfer_id:ids.blockedTransfer});
 assert.ok(rejectedClose.error && rejectedClose.error.message.includes("TRANSFER_FINANCIAL_POSITIONS_OPEN"),"Unpaid installment did not block transfer closure");
 const blockedState=must(await admin.from("condominium_member_transfers").select("status").eq("id",ids.blockedTransfer).single(),"blocked transfer state");
 assert.equal(blockedState.status,"Confermato");
 const blockedOwnerState=must(await admin.from("condominium_members").select("active,data").eq("id",ids.owner2).single(),"blocked outgoing owner state");
 assert.equal(blockedOwnerState.active,true);assert.equal(blockedOwnerState.data.position_status,"In chiusura");
 const installmentState=must(await admin.from("condominium_installments").select("amount,paid_amount,status").eq("id",ids.blockedInstallment).single(),"blocked installment state");
 assert.equal(Number(installmentState.amount),90);assert.equal(Number(installmentState.paid_amount),0);assert.equal(installmentState.status,"Da pagare");
 console.log(JSON.stringify({suite:"BETHAG_QA_APP08_11_TRANSFER",target:"jhuyhlzzydcgghrzeexn",status:"PASS",checks:["preview generated for active outgoing owner","resident denied transfer confirmation","administrator confirmed transfer using real RPC","outgoing owner remained active but In chiusura before closure","accounting snapshot readable","closure check returned zero open balance","official close RPC archived outgoing owner and closed transfer","€90 unpaid installment blocked closure without partial state changes"],financial_blocker_case:"PASS"},null,2));
}finally{
 if(ids.blockedTransfer) await cleanup.from("condominium_member_transfers").delete().eq("id",ids.blockedTransfer);
 if(ids.blockedInstallment) await cleanup.from("condominium_installments").delete().eq("id",ids.blockedInstallment);
 if(ids.fiscalYear) await cleanup.from("condominium_fiscal_years").delete().eq("id",ids.fiscalYear);
 if(ids.owner2) await cleanup.from("condominium_members").delete().eq("id",ids.owner2);
 if(ids.unit2) await cleanup.from("condominium_units").delete().eq("id",ids.unit2);
 if(ids.transfer) await cleanup.from("condominium_member_transfers").delete().eq("id",ids.transfer);
 if(ids.openTransfer) await cleanup.from("condominium_member_transfers").delete().eq("id",ids.openTransfer);
 if(ids.openInstallment) await cleanup.from("condominium_installments").delete().eq("id",ids.openInstallment);
 if(ids.openMember) await cleanup.from("condominium_members").delete().eq("id",ids.openMember);
 if(ids.old) await cleanup.from("condominium_members").delete().eq("id",ids.old);
 if(ids.unit) await cleanup.from("condominium_units").delete().eq("id",ids.unit);
 if(ids.condo) await cleanup.from("condominiums").delete().eq("id",ids.condo);
 await resident.auth.signOut();await admin.auth.signOut();
}
// QA verification rerun 2026-11-02
