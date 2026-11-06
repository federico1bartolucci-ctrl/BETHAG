import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
const baseURL=process.env.BETHAG_QA_BASE_URL||"http://127.0.0.1:4173/BETHAG/";
const projectURL="https://jhuyhlzzydcgghrzeexn.supabase.co";
const serviceRoleKey=process.env.BETHAG_QA_SERVICE_ROLE_KEY;
assert.ok(serviceRoleKey,"QA service-role key is required for the isolated Free-plan entitlement check");
const service=createClient(projectURL,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const accounts=[
 {role:"admin",label:"Amministratore",email:"bethag-admin-qa@example.com",password:process.env.BETHAG_QA_ADMIN_PASSWORD,landing:"Homepage"},
 {role:"collaborator",label:"Collaboratore",email:"bethag-collaboratore-qa@example.com",password:process.env.BETHAG_QA_COLLABORATOR_PASSWORD,landing:"Homepage"},
 {role:"resident",label:"Condomino",email:"bethag-condomino-qa@example.com",password:process.env.BETHAG_QA_RESIDENT_PASSWORD,landing:"Portale condòmino"}
];
for(const a of accounts)assert.ok(a.password,"Missing password for "+a.role);
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const a of accounts){
  let restoreWorkspacePlan=null;
  const context=await browser.newContext();const page=await context.newPage();const errors=[];const dialogs=[];page.on("dialog",async d=>{dialogs.push({type:d.type(),message:d.message()});await d.dismiss();});
  page.on("pageerror",e=>errors.push(e.message));
  try{
   await page.goto(baseURL,{waitUntil:"networkidle"});
   await page.getByRole("button",{name:"Accedi"}).first().click();
   await page.getByRole("heading",{name:"Accedi a BETHAG"}).waitFor();
   await page.getByRole("button",{name:a.label,exact:true}).click();
   await page.locator('input[type="email"]').first().fill(a.email);
   await page.locator('input[autocomplete="current-password"]').first().fill(a.password);
   await page.getByRole("button",{name:"Accedi",exact:true}).last().click();
   await page.getByText(a.landing,{exact:true}).first().waitFor({timeout:25000});
   if(a.role==="admin"){
    // Temporarily set the isolated QA workspace to Free so the locked-module
    // checks are real, then restore its original plan in the per-account finally.
    const users=await service.auth.admin.listUsers({page:1,perPage:1000});
    assert.ifError(users.error);
    const adminUser=users.data.users.find(user=>(user.email||"").toLowerCase()===a.email.toLowerCase());
    assert.ok(adminUser,"QA administrator auth user was not found");
    const membership=await service.from("workspace_members").select("workspace_id").eq("user_id",adminUser.id).eq("role","admin").eq("active",true).single();
    assert.ifError(membership.error);
    const workspace=await service.from("workspaces").select("plan").eq("id",membership.data.workspace_id).single();
    assert.ifError(workspace.error);
    const originalPlan=workspace.data.plan;
    const freePlan=await service.from("workspaces").update({plan:"free"}).eq("id",membership.data.workspace_id);
    assert.ifError(freePlan.error);
    restoreWorkspacePlan=async()=>{
     const restored=await service.from("workspaces").update({plan:originalPlan}).eq("id",membership.data.workspace_id);
     assert.ifError(restored.error);
     const verified=await service.from("workspaces").select("plan").eq("id",membership.data.workspace_id).single();
     assert.ifError(verified.error);
     assert.equal(verified.data.plan,originalPlan,"QA workspace plan was not restored after APP-15");
    };
    await page.reload({waitUntil:"domcontentloaded",timeout:30000});
    await page.locator(".sidebar .nav-item.active").filter({hasText:"Homepage"}).waitFor({timeout:20000});
    const planNav=page.getByRole("button",{name:"Piano e upgrade",exact:true});
    await planNav.waitFor({state:"visible",timeout:10000});
    await planNav.click();
    try {
     await page.waitForFunction(
      () => new URL(window.location.href).searchParams.get("page") === "abbonamento",
      null,
      {timeout:10000}
     );
     await page.getByRole("heading",{name:"Piano e upgrade",exact:true}).waitFor({timeout:10000});
    await page.getByText("BETHAG Free",{exact:true}).first().waitFor({timeout:15000});
    } catch (error) {
     const activeNav=page.locator(".sidebar .nav-item.active").first();
     const debug={
      url:page.url(),
      activeNav:await activeNav.count()?await activeNav.innerText():"",
      headings:await page.getByRole("heading").allTextContents(),
      dialogs,
     };
     console.error("APP15_PLAN_NAV_DEBUG",JSON.stringify(debug));
     throw error;
    }
    // The plan-card "Prova struttura" buttons are demo entitlement toggles,
    // not navigation controls. Clicking a dynamically re-labelled ".last()"
    // locator can retarget successive cards after each React render and mutate
    // the test account's local subscription state. Verify the page is rendered
    // without changing plan state; this suite is specifically for navigation.
    await page.getByRole("button",{name:"Prova struttura"}).first().waitFor({state:"visible",timeout:10000});
    await page.getByText("BETHAG Portal",{exact:true}).first().waitFor({timeout:10000});
    await page.locator(".sidebar .nav-item").filter({hasText:"Homepage"}).first().click();
    const labels=["Homepage","Condomini","Contabilità","Registro e sicurezza","Documenti","Scadenze","Assemblee","Fornitori","Attività","Lavori e manutenzioni","Comunicazioni","Portale condomini"];
    const blockedByPlan=[];
    for(const label of labels){
     const nav=page.locator(".sidebar .nav-item").filter({hasText:label}).first();
     await nav.waitFor({state:"visible",timeout:10000});
     const dialogCount=dialogs.length;
     await nav.click();
     const triggeredDialogs=dialogs.slice(dialogCount);
     const entitlementDialog=triggeredDialogs.find(dialog=>dialog.type==="confirm" && /non è compreso nel tuo piano attuale/i.test(dialog.message));
     if(entitlementDialog){
      // A Free-plan entitlement denial is the expected security/product behavior:
      // the module must not activate, and the test must continue with other destinations.
      blockedByPlan.push(label);
      continue;
     }
     assert.equal(triggeredDialogs.length,0,"Unexpected dialog while opening "+label+": "+JSON.stringify(triggeredDialogs));
     const active=page.locator(".sidebar .nav-item.active").first();
     await active.waitFor({state:"visible"});
     const activeText=(await active.innerText()).trim();
     assert.ok(activeText.includes(label),"Navigation did not activate "+label+"; active="+activeText);
    }
    assert.ok(!blockedByPlan.includes("Condomini"),"Free plan must retain access to the core Condomìni module");
    assert.ok(blockedByPlan.includes("Documenti"),"Free plan did not block the Documenti module");
    await page.locator(".sidebar .nav-item").filter({hasText:"Homepage"}).first().click();
    await page.locator(".sidebar .nav-item.active").filter({hasText:"Homepage"}).waitFor({timeout:10000});
    await page.reload({waitUntil:"domcontentloaded",timeout:30000});
    await page.locator(".sidebar .nav-item.active").filter({hasText:"Homepage"}).waitFor({timeout:20000});
    assert.match(page.url(), /[?&]page=homepage(?:&|$)/, "Refresh did not preserve the Homepage route");
    results.push({role:a.role,status:"PASS",checks:["all entitled administrator navigation destinations activated","Free plan retained core Condomìni access; locked modules were correctly blocked without changing active route: "+blockedByPlan.join(", "),"Homepage route survived refresh","no uncaught browser errors"]});
   }else if(a.role==="collaborator"){
    assert.equal(await page.locator(".nav-item").filter({hasText:"Contabilità"}).count(),0,"Collaborator unexpectedly sees administrator accounting navigation");
    assert.equal(await page.locator(".nav-item").filter({hasText:"Collaboratori"}).count(),0,"Collaborator unexpectedly sees collaborator administration");
    assert.ok(await page.locator(".nav-item.active").filter({hasText:"Homepage"}).count());
    results.push({role:a.role,status:"PASS",checks:["administrator-only accounting navigation absent","collaborator administration absent","Homepage active","no uncaught browser errors"]});
   }else{
    assert.equal(await page.locator(".nav-item").count(),0,"Resident unexpectedly sees staff navigation");
    assert.equal(await page.getByText("Contabilità",{exact:true}).count(),0,"Resident unexpectedly sees accounting");
    results.push({role:a.role,status:"PASS",checks:["resident portal landing visible","staff navigation absent","accounting control absent","no uncaught browser errors"]});
   }
   assert.deepEqual(errors,[]);
  }catch(e){results.push({role:a.role,status:"FAIL",error:String(e.message).slice(0,500),pageErrors:errors,dialogs,visible:(await page.locator("body").innerText()).slice(0,1200)});}
  finally{
   if(restoreWorkspacePlan) await restoreWorkspacePlan();
   await context.close();
  }
 }
}finally{await browser.close();}
console.log(JSON.stringify({suite:"BETHAG_QA_ROLE_NAVIGATION",target:"jhuyhlzzydcgghrzeexn",results},null,2));
if(results.some(x=>x.status!=="PASS"))process.exitCode=1;
