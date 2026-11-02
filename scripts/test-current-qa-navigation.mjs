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
  const context=await browser.newContext();const page=await context.newPage();const errors=[];
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
    const labels=["Homepage","Condomini","Contabilità","Registro e sicurezza","Documenti","Scadenze","Assemblee","Fornitori","Attività","Lavori e manutenzioni","Comunicazioni","Portale condomini"];
    for(const label of labels){
     const nav=page.locator(".nav-item").filter({hasText:label}).first();
     await nav.waitFor({state:"visible",timeout:10000});await nav.click();
     const active=page.locator(".nav-item.active");
     await active.waitFor({state:"visible"});
     assert.ok((await active.innerText()).includes(label),"Navigation did not activate "+label);
    }
    await page.reload({waitUntil:"networkidle"});
    await page.getByText("Homepage",{exact:true}).first().waitFor({timeout:20000});
    results.push({role:a.role,status:"PASS",checks:["12 administrator navigation destinations activated","refresh returned to stable Homepage","no uncaught browser errors"]});
   }else if(a.role==="collaborator"){
    assert.equal(await page.locator(".nav-item").filter({hasText:"Contabilità"}).count(),0,"Collaborator unexpectedly sees administrator accounting navigation");
    for(const label of ["Homepage","Condomini","Documenti","Scadenze","Assemblee","Fornitori","Attività","Comunicazioni","Portale condomini"]){
     const nav=page.locator(".nav-item").filter({hasText:label}).first();
     if(await nav.count()){await nav.click();const active=page.locator(".nav-item.active");await active.waitFor({state:"visible"});assert.ok((await active.innerText()).includes(label));}
    }
    results.push({role:a.role,status:"PASS",checks:["accounting navigation absent","permitted navigation destinations activated","no uncaught browser errors"]});
   }else{
    assert.equal(await page.locator(".nav-item").count(),0,"Resident unexpectedly sees staff navigation");
    assert.equal(await page.getByText("Contabilità",{exact:true}).count(),0,"Resident unexpectedly sees accounting");
    results.push({role:a.role,status:"PASS",checks:["resident portal landing visible","staff navigation absent","accounting control absent","no uncaught browser errors"]});
   }
   assert.deepEqual(errors,[]);
  }catch(e){results.push({role:a.role,status:"FAIL",error:String(e.message).slice(0,500),pageErrors:errors,visible:(await page.locator("body").innerText()).slice(0,1200)});}
  finally{await context.close();}
 }
}finally{await browser.close();}
console.log(JSON.stringify({suite:"BETHAG_QA_ROLE_NAVIGATION",target:"jhuyhlzzydcgghrzeexn",results},null,2));
if(results.some(x=>x.status!=="PASS"))process.exitCode=1;
