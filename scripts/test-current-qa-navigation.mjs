import assert from "node:assert/strict";
import { chromium } from "playwright";
const baseURL=process.env.BETHAG_QA_BASE_URL||"http://127.0.0.1:4173/BETHAG/";
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
    const planNav=page.locator(".sidebar .nav-item").filter({hasText:"Piano e upgrade"}).first();
    await planNav.waitFor({state:"visible",timeout:10000});
    await planNav.click();
    await page.getByRole("heading",{name:"Piano e upgrade",exact:true}).waitFor({timeout:10000});
    // The plan-card "Prova struttura" buttons are demo entitlement toggles,
    // not navigation controls. Clicking a dynamically re-labelled ".last()"
    // locator can retarget successive cards after each React render and mutate
    // the test account's local subscription state. Verify the page is rendered
    // without changing plan state; this suite is specifically for navigation.
    await page.getByRole("button",{name:"Prova struttura"}).first().waitFor({state:"visible",timeout:10000});
    await page.getByText("BETHAG Portal",{exact:true}).first().waitFor({timeout:10000});
    await page.locator(".sidebar .nav-item").filter({hasText:"Homepage"}).first().click();
    const labels=["Homepage","Condomini","Contabilità","Registro e sicurezza","Documenti","Scadenze","Assemblee","Fornitori","Attività","Lavori e manutenzioni","Comunicazioni","Portale condomini"];
    for(const label of labels){
     const nav=page.locator(".sidebar .nav-item").filter({hasText:label}).first();
     await nav.waitFor({state:"visible",timeout:10000});await nav.click();
     const active=page.locator(".sidebar .nav-item.active").first();
     await active.waitFor({state:"visible"});
     const activeText=(await active.innerText()).trim();
     assert.ok(activeText.includes(label),"Navigation did not activate "+label+"; active="+activeText);
    }
    // Return to Homepage before reloading; the previous version reloaded
    // while still on the final "Portale condomini" destination and expected
    // a different route, while networkidle waited for unrelated background sync.
    await page.locator(".sidebar .nav-item").filter({hasText:"Homepage"}).first().click();
    await page.locator(".sidebar .nav-item.active").filter({hasText:"Homepage"}).waitFor({timeout:10000});
    await page.reload({waitUntil:"domcontentloaded",timeout:30000});
    await page.locator(".sidebar .nav-item.active").filter({hasText:"Homepage"}).waitFor({timeout:20000});
    assert.match(page.url(), /[?&]page=homepage(?:&|$)/, "Refresh did not preserve the Homepage route");
    results.push({role:a.role,status:"PASS",checks:["12 administrator navigation destinations activated","Homepage route survived refresh","no uncaught browser errors"]});
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
  finally{await context.close();}
 }
}finally{await browser.close();}
console.log(JSON.stringify({suite:"BETHAG_QA_ROLE_NAVIGATION",target:"jhuyhlzzydcgghrzeexn",results},null,2));
if(results.some(x=>x.status!=="PASS"))process.exitCode=1;
