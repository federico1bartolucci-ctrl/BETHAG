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
const marker="BETHAG_QA_APP08_11_"+Date.now(), ids={condo:null,unit:null,old:null,transfer:null,incoming:[],sourceFiscalYear:null,openTransfer:null,openMember:null,openInstallment:null,unit2:null,owner2:null,fiscalYear:null,blockedTransfer:null,blockedInstallment:null,memberCarryover:null,unitCarryover:null};
const w=await admin.from("workspaces").select("id").eq("name","BETHAG_QA_FIXTURE_20261102").single();assert.ifError(w.error);
const must= (x,label)=>{assert.ifError(x.error);return x.data};
try{
 const fixtureCondoName="BETHAG_QA_APP08_11_CARRYOVER_FIXTURE";
 const existingFixture=must(await cleanup.from("condominiums").select("id,data").eq("workspace_id",w.data.id).eq("name",fixtureCondoName).maybeSingle(),"existing carryover fixture");
 if(existingFixture){ids.condo=existingFixture.id;assert.equal(existingFixture.data.bethag_qa_fixture,"APP08_11_CARRYOVER");}
 else {const condo=must(await admin.from("condominiums").insert({workspace_id:w.data.id,name:fixtureCondoName,address:"QA TEST FIXTURE - NON USARE",data:{bethag_qa_fixture:"APP08_11_CARRYOVER"}}).select("id").single(),"create persistent carryover fixture");ids.condo=condo.id;}
 const unit=must(await admin.from("condominium_units").insert({workspace_id:w.data.id,condominium_id:ids.condo,unit_code:"QA-T01",building_code:"A",data:{bethag_qa_marker:marker}}).select("id").single(),"unit");ids.unit=unit.id;
 const old=must(await admin.from("condominium_members").insert({condominium_id:ids.condo,unit_id:ids.unit,name:"Cedente QA",role:"resident",active:true,data:{role:"Proprietario",position_status:"Attivo",current_owner:true,ownership_share:100,bethag_qa_marker:marker}}).select("id").single(),"old owner");ids.old=old.id;
 const date1="2026-11-02";
 const preview=must(await admin.rpc("preview_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_transfer_date:date1}),"preview");
 assert.equal(preview.outgoing_member_id,ids.old);
 const forbidden=await resident.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_incoming_name:"Non autorizzato",p_incoming_email:null,p_incoming_user_id:null,p_transfer_date:"2026-11-03",p_transfer_type:"Vendita",p_notes:marker,p_data:{transfer_scope:"whole_property",incoming_members:[{name:"Non autorizzato",ownership_share:100}]}});
 assert.ok(forbidden.error,"Resident unexpectedly confirmed a transfer");
 const emailA="bethag-coowner-a-"+Date.now()+"@example.com";
 const emailB="bethag-coowner-b-"+Date.now()+"@example.com";
 const duplicate=await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_incoming_name:"Acquirente QA A",p_incoming_email:emailA,p_incoming_user_id:null,p_transfer_date:date1,p_transfer_type:"Vendita",p_notes:marker,p_data:{bethag_qa_marker:marker,transfer_scope:"whole_property",outgoing_member_ids:[ids.old],incoming_members:[{name:"Acquirente QA A",email:emailA,ownership_share:50},{name:"Acquirente QA B",email:emailA,ownership_share:50}]}});
 assert.ok(duplicate.error && duplicate.error.message.includes("INCOMING_COOWNER_EMAIL_DUPLICATE"),"Server did not reject duplicate co-owner e-mails.");
 const ownerAfterDuplicate=must(await admin.from("condominium_members").select("active,data").eq("id",ids.old).single(),"owner after duplicate rejection");
 assert.equal(ownerAfterDuplicate.active,true);assert.equal(ownerAfterDuplicate.data.position_status,"Attivo");assert.equal(ownerAfterDuplicate.data.current_owner,true);
 const created=must(await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit,p_outgoing_member_id:ids.old,p_incoming_name:"Acquirente QA A",p_incoming_email:emailA,p_incoming_user_id:null,p_transfer_date:date1,p_transfer_type:"Vendita",p_notes:marker,p_data:{bethag_qa_marker:marker,transfer_scope:"whole_property",outgoing_member_ids:[ids.old],incoming_members:[{name:"Acquirente QA A",email:emailA,ownership_share:60,firstName:"Acquirente",lastName:"QA A",fiscalCode:"RSSMRA80A01H501U",phone:"3330000001"},{name:"Acquirente QA B",email:emailB,ownership_share:40,firstName:"Acquirente",lastName:"QA B",fiscalCode:"BNCLGU81A02H501V",phone:"3330000002"}]}}),"confirm transfer");
 ids.transfer=created;
 const transferData=must(await admin.from("condominium_member_transfers").select("data").eq("id",ids.transfer).single(),"transfer incoming IDs");
 ids.incoming=Array.isArray(transferData.data.incoming_member_ids)?transferData.data.incoming_member_ids.map(String):[];
 assert.equal(ids.incoming.length,2,"Two incoming member IDs must be stored on the transfer.");
 const incomingRows=must(await admin.from("condominium_members").select("id,name,email,active,data").in("id",ids.incoming).eq("unit_id",ids.unit),"incoming co-owners");
 assert.equal(incomingRows.length,2);
 const byEmail=new Map(incomingRows.map(row=>[row.email,row]));
 const incomingA=byEmail.get(emailA),incomingB=byEmail.get(emailB);
 assert.ok(incomingA&&incomingB,"Both incoming co-owners must be linked to their distinct e-mails.");
 assert.equal(Number(incomingA.data.ownership_share),60);assert.equal(Number(incomingB.data.ownership_share),40);
 assert.equal(incomingA.data.firstName,"Acquirente");assert.equal(incomingA.data.lastName,"QA A");assert.equal(incomingA.data.fiscalCode,"RSSMRA80A01H501U");assert.equal(incomingA.data.phone,"3330000001");
 assert.equal(incomingB.data.firstName,"Acquirente");assert.equal(incomingB.data.lastName,"QA B");assert.equal(incomingB.data.fiscalCode,"BNCLGU81A02H501V");assert.equal(incomingB.data.phone,"3330000002");
 assert.equal(Object.hasOwn(incomingA.data,"incoming_members"),false);assert.equal(Object.hasOwn(incomingB.data,"incoming_members"),false);
 assert.equal(incomingRows.every(row=>row.active&&row.data.current_owner===true),true);
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
 const incomingAfter=must(await admin.from("condominium_members").select("id,active,data").in("id",ids.incoming),"closed incoming co-owners");
 assert.equal(incomingAfter.length,2);assert.equal(incomingAfter.every(row=>row.active&&row.data.current_owner===true),true);
 const transferAfter=must(await admin.from("condominium_member_transfers").select("status,closed_by").eq("id",ids.transfer).single(),"closed transfer state");
 assert.equal(transferAfter.status,"Chiuso");

 // APP-09/11: an unpaid installment must block the official close operation
 // without partially changing the transfer or either member's position.
 const unit2=must(await admin.from("condominium_units").insert({workspace_id:w.data.id,condominium_id:ids.condo,unit_code:"QA-T02",building_code:"A",data:{bethag_qa_marker:marker}}).select("id").single(),"financial blocker unit");ids.unit2=unit2.id;
 const owner2=must(await admin.from("condominium_members").insert({condominium_id:ids.condo,unit_id:ids.unit2,name:"Cedente QA insoluto",role:"resident",active:true,data:{role:"Proprietario",position_status:"Attivo",current_owner:true,ownership_share:100,bethag_qa_marker:marker}}).select("id").single(),"financial blocker owner");ids.owner2=owner2.id;
 const sourceYearName="Esercizio chiuso QA APP08_11";
 const existingSourceYear=must(await cleanup.from("condominium_fiscal_years").select("id,status").eq("workspace_id",w.data.id).eq("condominium_id",ids.condo).eq("name",sourceYearName).maybeSingle(),"existing closed source fiscal year");
 if(existingSourceYear) ids.sourceFiscalYear=existingSourceYear.id;
 else {const sourceYear=must(await admin.from("condominium_fiscal_years").insert({workspace_id:w.data.id,condominium_id:ids.condo,name:sourceYearName,start_date:"2025-01-01",end_date:"2025-12-31",status:"Aperto",opening_balance:0,notes:"Fixture QA persistente per test riporti contabili"}).select("id").single(),"create source fiscal year");ids.sourceFiscalYear=sourceYear.id;}
 const sourceStatus=must(await cleanup.from("condominium_fiscal_years").select("status").eq("id",ids.sourceFiscalYear).single(),"source fiscal year status");
 if(sourceStatus.status!=="Chiuso") must(await admin.rpc("close_condominium_fiscal_year",{p_workspace_id:w.data.id,p_fiscal_year_id:ids.sourceFiscalYear}),"close source fiscal year through official RPC");
 const closedSource=must(await cleanup.from("condominium_fiscal_years").select("status,end_date").eq("id",ids.sourceFiscalYear).single(),"verify closed source fiscal year");
 assert.equal(closedSource.status,"Chiuso");assert.equal(closedSource.end_date,"2025-12-31");
 const fiscalYear=must(await admin.from("condominium_fiscal_years").insert({workspace_id:w.data.id,condominium_id:ids.condo,name:"Esercizio insoluto QA "+marker,start_date:"2026-01-01",end_date:"2026-12-31",status:"Aperto",opening_balance:0,notes:marker}).select("id").single(),"financial blocker target fiscal year");ids.fiscalYear=fiscalYear.id;
 const installment=must(await admin.from("condominium_installments").insert({workspace_id:w.data.id,condominium_id:ids.condo,fiscal_year_id:ids.fiscalYear,member_id:ids.owner2,unit_id:ids.unit2,title:"Rata insoluta QA",due_date:"2026-11-15",amount:90,paid_amount:0,status:"Da pagare",notes:marker}).select("id").single(),"financial blocker installment");ids.blockedInstallment=installment.id;
 const memberCarryover=must(await cleanup.from("condominium_fiscal_carryovers").insert({workspace_id:w.data.id,condominium_id:ids.condo,source_fiscal_year_id:ids.sourceFiscalYear,target_fiscal_year_id:ids.fiscalYear,unit_id:ids.unit2,member_id:ids.owner2,balance:30,kind:"Debito",status:"Da riportare",notes:marker}).select("id").single(),"member carryover");ids.memberCarryover=memberCarryover.id;
 const unitCarryover=must(await cleanup.from("condominium_fiscal_carryovers").insert({workspace_id:w.data.id,condominium_id:ids.condo,source_fiscal_year_id:ids.sourceFiscalYear,target_fiscal_year_id:ids.fiscalYear,unit_id:ids.unit2,member_id:null,balance:-45,kind:"Credito",status:"Da riportare",notes:marker}).select("id").single(),"unit carryover");ids.unitCarryover=unitCarryover.id;
 const blocked=must(await admin.rpc("confirm_condominium_member_transfer",{p_unit_id:ids.unit2,p_outgoing_member_id:ids.owner2,p_incoming_name:"Acquirente QA insoluto",p_incoming_email:null,p_incoming_user_id:null,p_transfer_date:date1,p_transfer_type:"Vendita",p_notes:marker,p_data:{bethag_qa_marker:marker,transfer_scope:"whole_property",outgoing_member_ids:[ids.owner2],incoming_members:[{name:"Acquirente QA insoluto",ownership_share:100}]}}),"confirm blocked transfer");ids.blockedTransfer=blocked;
 const closureCheckBlocked=must(await admin.rpc("check_condominium_member_transfer_closure",{p_transfer_id:ids.blockedTransfer}),"blocked closure check");
 assert.equal(Number(closureCheckBlocked.open_installments),90);
 assert.equal(Number(closureCheckBlocked.open_member_carryovers),30);
 assert.equal(Number(closureCheckBlocked.open_unit_carryovers),45);
 assert.equal(Number(closureCheckBlocked.open_total),165);
 const rejectedClose=await admin.rpc("close_condominium_member_transfer",{p_transfer_id:ids.blockedTransfer});
 assert.ok(rejectedClose.error && rejectedClose.error.message.includes("TRANSFER_FINANCIAL_POSITIONS_OPEN"),"Unpaid installment did not block transfer closure");
 const blockedState=must(await admin.from("condominium_member_transfers").select("status").eq("id",ids.blockedTransfer).single(),"blocked transfer state");
 assert.equal(blockedState.status,"Confermato");
 const blockedOwnerState=must(await admin.from("condominium_members").select("active,data").eq("id",ids.owner2).single(),"blocked outgoing owner state");
 assert.equal(blockedOwnerState.active,true);assert.equal(blockedOwnerState.data.position_status,"In chiusura");
 const installmentState=must(await admin.from("condominium_installments").select("amount,paid_amount,status").eq("id",ids.blockedInstallment).single(),"blocked installment state");
 assert.equal(Number(installmentState.amount),90);assert.equal(Number(installmentState.paid_amount),0);assert.equal(installmentState.status,"Da pagare");
 const memberCarryoverState=must(await cleanup.from("condominium_fiscal_carryovers").select("balance,kind,status").eq("id",ids.memberCarryover).single(),"member carryover state");
 assert.equal(Number(memberCarryoverState.balance),30);assert.equal(memberCarryoverState.kind,"Debito");assert.equal(memberCarryoverState.status,"Da riportare");
 const unitCarryoverState=must(await cleanup.from("condominium_fiscal_carryovers").select("balance,kind,status").eq("id",ids.unitCarryover).single(),"unit carryover state");
 assert.equal(Number(unitCarryoverState.balance),-45);assert.equal(unitCarryoverState.kind,"Credito");assert.equal(unitCarryoverState.status,"Da riportare");
 console.log(JSON.stringify({suite:"BETHAG_QA_APP08_11_TRANSFER",target:"jhuyhlzzydcgghrzeexn",status:"PASS",checks:["preview generated for active outgoing owner","resident denied transfer confirmation","duplicate incoming co-owner e-mail rejected by database trigger with full rollback","administrator confirmed two incoming co-owners with 60/40 shares","each co-owner retained individual e-mail, fiscal code and phone metadata without duplicated co-owner list in profile data","both incoming co-owners remained active after official closure","outgoing owner archived and transfer closed","€90 unpaid installment blocked closure","closed 2025 source fiscal year created through official closure RPC and reused as a QA-only fixture","€30 member carryover and €45 unit carryover blocked closure","transfer, owner, installment and both carryovers remained unchanged after rejected close"],financial_blocker_case:"PASS",multiple_coowner_case:"PASS"},null,2));
}finally{
 if(ids.blockedTransfer) await cleanup.from("condominium_member_transfers").delete().eq("id",ids.blockedTransfer);
 if(ids.blockedInstallment) await cleanup.from("condominium_installments").delete().eq("id",ids.blockedInstallment);
 if(ids.memberCarryover) await cleanup.from("condominium_fiscal_carryovers").delete().eq("id",ids.memberCarryover);
 if(ids.unitCarryover) await cleanup.from("condominium_fiscal_carryovers").delete().eq("id",ids.unitCarryover);
 if(ids.fiscalYear) await cleanup.from("condominium_fiscal_years").delete().eq("id",ids.fiscalYear);
 if(ids.owner2) await cleanup.from("condominium_members").delete().eq("id",ids.owner2);
 if(ids.unit2) await cleanup.from("condominium_units").delete().eq("id",ids.unit2);
 if(ids.transfer) await cleanup.from("condominium_member_transfers").delete().eq("id",ids.transfer);
 if(ids.openTransfer) await cleanup.from("condominium_member_transfers").delete().eq("id",ids.openTransfer);
 if(ids.openInstallment) await cleanup.from("condominium_installments").delete().eq("id",ids.openInstallment);
 if(ids.openMember) await cleanup.from("condominium_members").delete().eq("id",ids.openMember);
 for(const incomingId of ids.incoming) await cleanup.from("condominium_members").delete().eq("id",incomingId);
 if(ids.old) await cleanup.from("condominium_members").delete().eq("id",ids.old);
 if(ids.unit) await cleanup.from("condominium_units").delete().eq("id",ids.unit);
 // Keep the explicitly named QA-only condominium and its closed 2025 source year; per-run records are removed above.
 await resident.auth.signOut();await admin.auth.signOut();
}
// QA verification rerun 2026-11-02
