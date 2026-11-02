import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url="https://jhuyhlzzydcgghrzeexn.supabase.co",key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const passwords={admin:process.env.BETHAG_QA_ADMIN_PASSWORD,resident:process.env.BETHAG_QA_RESIDENT_PASSWORD};
assert.ok(key&&passwords.admin&&passwords.resident,"QA credentials missing");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const resident=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const a=await admin.auth.signInWithPassword({email:"bethag-admin-qa@example.com",password:passwords.admin});assert.ifError(a.error);
const r=await resident.auth.signInWithPassword({email:"bethag-condomino-qa@example.com",password:passwords.resident});assert.ifError(r.error);
const marker="BETHAG_QA_APP12_"+Date.now();
const w=await admin.from("workspaces").select("id").eq("name","BETHAG_QA_FIXTURE_20261102").single();assert.ifError(w.error);
const c=await admin.from("condominiums").select("id").eq("workspace_id",w.data.id).eq("name","Condominio QA BETHAG").single();assert.ifError(c.error);
let communicationId=null;
try{
 const created=await admin.from("communications").insert({workspace_id:w.data.id,condominium_id:c.data.id,title:marker,body:"Comunicazione sintetica per collaudo QA",published:false,data:{bethag_qa_marker:marker}}).select("id").single();
 assert.ifError(created.error);communicationId=created.data.id;
 const hidden=await resident.from("communications").select("id").eq("id",communicationId);assert.ifError(hidden.error);assert.equal(hidden.data.length,0,"Resident read an unpublished communication");
 const publish=await admin.from("communications").update({published:true}).eq("id",communicationId).eq("workspace_id",w.data.id);assert.ifError(publish.error);
 const visible=await resident.from("communications").select("id,title,body,published").eq("id",communicationId);assert.ifError(visible.error);assert.equal(visible.data.length,1);assert.equal(visible.data[0].published,true);assert.equal(visible.data[0].title,marker);
 const unpublish=await admin.from("communications").update({published:false}).eq("id",communicationId).eq("workspace_id",w.data.id);assert.ifError(unpublish.error);
 const hiddenAgain=await resident.from("communications").select("id").eq("id",communicationId);assert.ifError(hiddenAgain.error);assert.equal(hiddenAgain.data.length,0);
 console.log(JSON.stringify({suite:"BETHAG_QA_APP12_COMMUNICATIONS",target:"jhuyhlzzydcgghrzeexn",status:"PASS",checks:["administrator created unpublished communication","resident could not read draft","resident read published communication","resident lost visibility after unpublishing"],email_delivery:"NOT TESTED — no email sent"},null,2));
}finally{
 if(communicationId){const del=await admin.from("communications").delete().eq("id",communicationId).eq("workspace_id",w.data.id);assert.ifError(del.error);}
 await resident.auth.signOut();await admin.auth.signOut();
}
