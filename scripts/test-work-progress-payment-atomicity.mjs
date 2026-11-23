import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const baselineFunctionsPath="supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const migrationPath="supabase/rebuild/proposed-forward-migrations/20261123050000_atomic_work_progress_payment_registration.sql";
const baselineSource=await readFile(baselineFunctionsPath,"utf8");
const migrationSource=await readFile(migrationPath,"utf8");
function extractFunction(source,signature){
 const start=source.indexOf("CREATE OR REPLACE FUNCTION "+signature+"(");assert.notEqual(start,-1,"Missing baseline function: "+signature);
 const marker="AS $function$",delimiter="$function$";const bodyStart=source.indexOf(marker,start);assert.notEqual(bodyStart,-1,"Function body not found: "+signature);
 const bodyEnd=source.indexOf(delimiter,bodyStart+marker.length);assert.notEqual(bodyEnd,-1,"Function body not closed: "+signature);
 return source.slice(start,bodyEnd+delimiter.length).trimEnd()+";";
}
const validationFunction=extractFunction(baselineSource,"public.validate_condominium_work_progress_accounting_links");
const summaryFunction=extractFunction(baselineSource,"public.sync_condominium_work_financial_summary");
const summaryTriggerFunction=extractFunction(baselineSource,"public.sync_condominium_work_financial_summary_trigger");
const db=new PGlite();
const workspace="11111111-1111-4111-8111-111111111111",condominium="22222222-2222-4222-8222-222222222222";
const workA="33333333-3333-4333-8333-333333333333",progressA="44444444-4444-4444-8444-444444444444",progressB="55555555-5555-4555-8555-555555555555";
const workB="66666666-6666-4666-8666-666666666666",progressC="77777777-7777-4777-8777-777777777777",progressD="88888888-8888-4888-888888888888";
const oldPayment1="99999999-9999-4999-8999-999999999991",oldPayment2="99999999-9999-4999-8999-999999999992";
const today=new Date().toISOString().slice(0,10),year=Number(today.slice(0,4)),yearStart=year+"-01-01",yearEnd=year+"-12-31",nextYearDate=(year+1)+"-01-01";
const fiscalYearId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function ledgerCount(){return (await db.query("SELECT count(*)::int AS n FROM public.condominium_ledger_entries")).rows[0].n;}
async function progressRow(id){const r=await db.query("SELECT paid_amount,ledger_entry_id,payment_entry_id,status FROM public.condominium_work_progress WHERE id=$1",[id]);assert.equal(r.rows.length,1);return r.rows[0];}
async function directPayment(id,amount,progressId){
 await db.query("INSERT INTO public.condominium_ledger_entries(id,workspace_id,condominium_id,fiscal_year_id,entry_date,direction,category,description,amount,payment_status,due_date,notes,data) VALUES($1,$2,$3,$4,$5,'Uscita','Pagamento SAL','Test pagamento SAL',$6,'Pagato',$5,'',pg_catalog.jsonb_build_object('work_id',$7,'progress_id',$8,'source','SAL pagamento'))",[id,workspace,condominium,fiscalYearId,today,amount,workA,progressId]);
}
try{
 await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
 await db.exec("CREATE TABLE public.condominium_works(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,title text NOT NULL,supplier_id uuid,approved_amount numeric NOT NULL DEFAULT 0,actual_amount numeric NOT NULL DEFAULT 0,paid_amount numeric NOT NULL DEFAULT 0,remaining_amount numeric NOT NULL DEFAULT 0,progress_percent numeric NOT NULL DEFAULT 0,payment_status text NOT NULL DEFAULT 'Nessun importo',updated_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE public.condominium_fiscal_years(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,start_date date NOT NULL,end_date date NOT NULL,status text NOT NULL); CREATE TABLE public.condominium_ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,fiscal_year_id uuid,entry_date date NOT NULL,direction text NOT NULL,category text NOT NULL,description text NOT NULL,amount numeric(14,2) NOT NULL,payment_status text NOT NULL,due_date date,supplier_id uuid,notes text NOT NULL DEFAULT '',data jsonb NOT NULL DEFAULT '{}'::jsonb); CREATE TABLE public.condominium_work_progress(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,work_id uuid NOT NULL,progress_no integer NOT NULL,progress_date date NOT NULL,title text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'Presentato',percentage numeric NOT NULL DEFAULT 0,amount numeric NOT NULL DEFAULT 0,paid_amount numeric NOT NULL DEFAULT 0,notes text NOT NULL DEFAULT '',ledger_entry_id uuid REFERENCES public.condominium_ledger_entries(id),payment_entry_id uuid REFERENCES public.condominium_ledger_entries(id),CHECK(amount>=0 AND paid_amount>=0 AND paid_amount<=amount),CHECK(progress_no>0 AND percentage>=0 AND percentage<=100),UNIQUE(work_id,progress_no));");
 await db.exec(validationFunction);await db.exec(summaryFunction);await db.exec(summaryTriggerFunction);
 await db.exec("CREATE TRIGGER validate_condominium_work_progress_accounting_links BEFORE INSERT OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_work_progress_accounting_links(); CREATE TRIGGER sync_condominium_work_financial_summary AFTER INSERT OR UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION public.sync_condominium_work_financial_summary_trigger();");
 await db.query("INSERT INTO public.condominium_fiscal_years(id,workspace_id,condominium_id,start_date,end_date,status) VALUES($1,$2,$3,$4,$5,'Aperto')",[fiscalYearId,workspace,condominium,yearStart,yearEnd]);
 await db.query("INSERT INTO public.condominium_works(id,workspace_id,condominium_id,title,approved_amount) VALUES($1,$2,$3,'Intervento A',200),($4,$2,$3,'Intervento B',100)",[workA,workspace,condominium,workB]);
 await db.query("INSERT INTO public.condominium_work_progress(id,workspace_id,condominium_id,work_id,progress_no,progress_date,title,amount,paid_amount) VALUES($1,$2,$3,$4,1,$5,'SAL 1',100,0),($6,$2,$3,$4,2,$5,'SAL 2',100,0)",[progressA,workspace,condominium,workA,today,progressB]);
 await db.query("INSERT INTO public.condominium_work_progress(id,workspace_id,condominium_id,work_id,progress_no,progress_date,title,amount,paid_amount) VALUES($1,$2,$3,$4,1,$5,'SAL 1',50,25),($6,$2,$3,$4,2,$5,'SAL 2',50,20)",[progressC,workspace,condominium,workB,today,progressD]);
 // Reproduce the old two-request flow: insert ledger, then update cumulative SAL.
 await directPayment(oldPayment1,60,progressA);await db.query("UPDATE public.condominium_work_progress SET paid_amount=60,payment_entry_id=$1 WHERE id=$2",[oldPayment1,progressA]);
 await directPayment(oldPayment2,40,progressA);
 await assert.rejects(()=>db.query("UPDATE public.condominium_work_progress SET paid_amount=100,payment_entry_id=$1 WHERE id=$2",[oldPayment2,progressA]),/pagato del SAL supera/i);
 assert.equal(await ledgerCount(),2);assert.equal(Number((await progressRow(progressA)).paid_amount),60);
 console.log("PASS baseline defect reproduced: second partial payment rejected and second ledger movement orphaned.");
 // Reset reproduction and apply the proposed RPC migration.
 await db.query("UPDATE public.condominium_work_progress SET paid_amount=0,payment_entry_id=null,status='Presentato' WHERE id=$1",[progressA]);
 await db.query("DELETE FROM public.condominium_ledger_entries WHERE id=$1 OR id=$2",[oldPayment1,oldPayment2]);
 await db.exec(migrationSource);
 const partialRpc=(amount,progressId=progressA,date=today,notes="runtime regression")=>db.query("SELECT public.register_condominium_work_progress_payment($1,$2,$3,$4,$5,$6,$7) AS payment_entry_id",[workspace,condominium,workA,progressId,date,amount,notes]);
 const first=(await partialRpc(60)).rows[0].payment_entry_id,second=(await partialRpc(40)).rows[0].payment_entry_id;
 assert.notEqual(first,second);assert.equal(Number((await progressRow(progressA)).paid_amount),100);assert.equal((await progressRow(progressA)).payment_entry_id,second);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM public.condominium_ledger_entries WHERE data->>'progress_id'=$1 AND data->>'source'='SAL pagamento'",[progressA])).rows[0].n,2);
 const beforeOverpay=await ledgerCount();await assert.rejects(()=>partialRpc(0.01),/supera l'importo residuo del SAL/i);assert.equal(await ledgerCount(),beforeOverpay);
 // Forced post-insert update failures prove the RPC rolls the ledger insert back.
 await db.exec("CREATE FUNCTION public.test_fail_work_progress_payment_update() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN IF new.id='55555555-5555-4555-8555-555555555555'::uuid AND new.payment_entry_id IS NOT NULL AND new.paid_amount>old.paid_amount THEN RAISE EXCEPTION 'forced partial-payment update failure'; END IF; IF new.id='88888888-8888-4888-8888-888888888888'::uuid AND new.ledger_entry_id IS NOT NULL AND old.ledger_entry_id IS NULL THEN RAISE EXCEPTION 'forced full-payment update failure'; END IF; RETURN new; END; $function$; CREATE TRIGGER zzz_test_fail_work_progress_payment_update BEFORE UPDATE ON public.condominium_work_progress FOR EACH ROW EXECUTE FUNCTION public.test_fail_work_progress_payment_update();");
 const beforeForcedPartial=await ledgerCount();await assert.rejects(()=>partialRpc(25,progressB),/forced partial-payment update failure/i);assert.equal(await ledgerCount(),beforeForcedPartial);assert.equal(Number((await progressRow(progressB)).paid_amount),0);
 const fullRpc=(progressId,notes="full payment regression")=>db.query("SELECT public.record_condominium_work_progress_payment($1,$2,$3,$4,$5,$6) AS payment_entry_id",[workspace,condominium,workB,progressId,today,notes]);
 const full=(await fullRpc(progressC)).rows[0].payment_entry_id;assert.ok(full);const fullRow=await progressRow(progressC);assert.equal(fullRow.ledger_entry_id,full);assert.equal(fullRow.status,"Pagato");assert.equal(await ledgerCount(),beforeForcedPartial+1);
 const beforeForcedFull=await ledgerCount();await assert.rejects(()=>fullRpc(progressD),/forced full-payment update failure/i);assert.equal(await ledgerCount(),beforeForcedFull);assert.equal((await progressRow(progressD)).ledger_entry_id,null);
 await db.exec("DROP TRIGGER zzz_test_fail_work_progress_payment_update ON public.condominium_work_progress; DROP FUNCTION public.test_fail_work_progress_payment_update();");
 const beforeInvalidDate=await ledgerCount();await assert.rejects(()=>partialRpc(1,progressA,nextYearDate),/Non esiste un esercizio aperto/i);assert.equal(await ledgerCount(),beforeInvalidDate);
 console.log("PASS atomic payment runtime: cumulative partials, overpayment rejection, full-payment linking, and rollback on update failure.");
}finally{await db.close();}
