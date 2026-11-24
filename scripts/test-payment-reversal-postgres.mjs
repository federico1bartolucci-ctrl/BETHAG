import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL must point to a disposable local PostgreSQL 17 database.");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Refusing non-local DATABASE_URL.");
assert.equal(target.pathname.replace(/^\//, ""), "bethag_payment_reversal_test", "This test only runs against its dedicated disposable database.");

function psql(args = []) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}
function extractProductionFunction(source, signature) {
  const start = source.indexOf("CREATE OR REPLACE FUNCTION " + signature + "(");
  assert.notEqual(start, -1, "Production baseline is missing function " + signature);
  const marker = "AS $function$";
  const delimiter = "$function$";
  const bodyStart = source.indexOf(marker, start);
  assert.notEqual(bodyStart, -1);
  const bodyEnd = source.indexOf(delimiter, bodyStart + marker.length);
  assert.notEqual(bodyEnd, -1);
  return source.slice(start, bodyEnd + delimiter.length).trimEnd() + ";";
}

const functionsSource = await readFile("supabase/migrations/20261017000003_bethag_baseline_functions.sql", "utf8");
const securitySource = await readFile("supabase/migrations/20261017000004_bethag_baseline_security.sql", "utf8");
const reverseSql = extractProductionFunction(functionsSource, "private.reverse_condominium_installment_payment");
const syncSql = extractProductionFunction(functionsSource, "public.sync_condominium_installment_from_payments");
const triggerSql = securitySource.split("\n").find((line) => line.includes("CREATE TRIGGER trg_sync_installment_from_payments"));
const proposedSql = await readFile("supabase/rebuild/proposed-forward-migrations/20261122200000_reset_all_consolidated_allocations_after_payment_reversal.sql", "utf8");
assert.ok(triggerSql, "The production trigger declaration must exist.");
assert.match(proposedSql, /CREATE OR REPLACE FUNCTION public\.sync_condominium_installment_from_payments/);
assert.doesNotMatch(proposedSql, /exit when v_remaining<=0\.005;/);

const tableCount = psql(["-At", "-c", "SELECT count(*) FROM pg_tables WHERE schemaname='public'"]).trim();
assert.equal(tableCount, "0", "Refusing to reuse a database that is not empty.");

const setupSql = [
  "CREATE SCHEMA auth; CREATE SCHEMA private;",
  "CREATE TABLE public.condominium_fiscal_years(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,status text NOT NULL);",
  "CREATE TABLE public.condominium_installments(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,fiscal_year_id uuid,member_id uuid,unit_id uuid,title text,due_date date NOT NULL,amount numeric NOT NULL,paid_amount numeric NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'Da pagare',ledger_entry_id uuid);",
  "CREATE TABLE public.condominium_payment_movements(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,installment_id uuid NOT NULL,payment_date date NOT NULL,amount numeric NOT NULL,method text NOT NULL DEFAULT 'Bonifico',reference text DEFAULT '',notes text DEFAULT '');",
  "CREATE TABLE public.condominium_payment_reversal_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),original_payment_id uuid UNIQUE NOT NULL,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,installment_id uuid NOT NULL,amount numeric NOT NULL,payment_date date NOT NULL,method text NOT NULL,reference text,notes text,reversal_reason text NOT NULL,reversed_at timestamptz NOT NULL DEFAULT now(),reversed_by uuid NOT NULL);",
  "CREATE TABLE public.condominium_expense_allocations(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,ledger_entry_id uuid NOT NULL,unit_id uuid,member_id uuid,amount numeric NOT NULL,paid_amount numeric NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'Da pagare');",
  "CREATE TABLE public.condominium_members(id uuid PRIMARY KEY,condominium_id uuid NOT NULL,unit_id uuid,user_id uuid,email text,active boolean NOT NULL,data jsonb NOT NULL DEFAULT '{}'::jsonb);",
  "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $auth$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $auth$;",
  "CREATE FUNCTION private.can_manage_workspace_module(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $perm$ SELECT current_setting('bethag.test.manage',true) = 'on' $perm$;"
].join("\n");

const testSql = [
  "DO $test$",
  "DECLARE",
  "  w uuid := '11111111-1111-4111-8111-111111111111';",
  "  c uuid := '22222222-2222-4222-8222-222222222222';",
  "  y uuid := '33333333-3333-4333-8333-333333333333';",
  "  actor uuid := '55555555-5555-4555-8555-555555555555';",
  "  unit_a uuid := '66666666-6666-4666-8666-666666666666';",
  "  unit_b uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';",
  "  member_group uuid := '12121212-1212-4121-8121-121212121212';",
  "  member_a uuid := '21212121-2121-4212-8212-212121212121';",
  "  member_b uuid := '23232323-2323-4232-8232-232323232323';",
  "  installment_group uuid := '13131313-1313-4131-8131-131313131313';",
  "  ledger_group uuid := '14141414-1414-4141-8141-141414141414';",
  "  payment_70 uuid := '15151515-1515-4151-8151-151515151515';",
  "  payment_30 uuid := '16161616-1616-4161-8161-161616161616';",
  "  allocation_60 uuid := '17171717-1717-4171-8171-171717171717';",
  "  allocation_40 uuid := '18181818-1818-4181-8181-181818181818';",
  "  member_inactive_group uuid := '24242424-2424-4242-8242-242424242424';",
  "  member_inactive_unit uuid := '29292929-2929-4292-8292-292929292929';",
  "  installment_inactive uuid := '25252525-2525-4252-8252-252525252525';",
  "  ledger_inactive uuid := '26262626-2626-4262-8262-262626262626';",
  "  payment_inactive uuid := '27272727-2727-4272-8272-272727272727';",
  "  allocation_inactive uuid := '28282828-2828-4282-8282-282828282828';",
  "  v_paid numeric;",
  "  v_status text;",
  "  v_alloc_a numeric;",
  "  v_alloc_b numeric;",
  "  v_alloc_status_a text;",
  "  v_alloc_status_b text;",
  "BEGIN",
  "  PERFORM set_config('request.jwt.claim.sub',actor::text,true);",
  "  PERFORM set_config('bethag.test.manage','on',true);",
  "  INSERT INTO public.condominium_fiscal_years VALUES(y,w,c,'Aperto');",
  "  INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES",
  "    (member_group,c,null,null,'owner@example.test',true,'{\"role\":\"Proprietario\"}'::jsonb),",
  "    (member_a,c,unit_a,null,'owner@example.test',true,'{\"role\":\"Proprietario\"}'::jsonb),",
  "    (member_b,c,unit_b,null,'owner@example.test',true,'{\"role\":\"Proprietario\"}'::jsonb);",
  "  INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,fiscal_year_id,member_id,unit_id,title,due_date,amount,paid_amount,status,ledger_entry_id) VALUES",
  "    (installment_group,w,c,y,member_group,null,'Rata consolidata','2099-12-31',100,0,'Da pagare',ledger_group);",
  "  INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,amount) VALUES",
  "    (allocation_60,w,c,ledger_group,unit_a,60),(allocation_40,w,c,ledger_group,unit_b,40);",
  "  INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount) VALUES",
  "    (payment_70,w,c,installment_group,'2026-11-01',70),(payment_30,w,c,installment_group,'2026-11-02',30);",
  "  SELECT paid_amount,status INTO v_paid,v_status FROM public.condominium_installments WHERE id=installment_group;",
  "  IF v_paid<>100 OR v_status<>'Pagato' THEN RAISE EXCEPTION 'Initial payment sum mismatch: %, %',v_paid,v_status; END IF;",
  "  SELECT paid_amount,status INTO v_alloc_a,v_alloc_status_a FROM public.condominium_expense_allocations WHERE id=allocation_60;",
  "  SELECT paid_amount,status INTO v_alloc_b,v_alloc_status_b FROM public.condominium_expense_allocations WHERE id=allocation_40;",
  "  IF v_alloc_a<>60 OR v_alloc_status_a<>'Pagato' OR v_alloc_b<>40 OR v_alloc_status_b<>'Pagato' THEN RAISE EXCEPTION 'Initial allocation distribution mismatch'; END IF;",
  "  PERFORM private.reverse_condominium_installment_payment(w,c,payment_30,'test reversal');",
  "  SELECT paid_amount,status INTO v_paid,v_status FROM public.condominium_installments WHERE id=installment_group;",
  "  SELECT paid_amount,status INTO v_alloc_a,v_alloc_status_a FROM public.condominium_expense_allocations WHERE id=allocation_60;",
  "  SELECT paid_amount,status INTO v_alloc_b,v_alloc_status_b FROM public.condominium_expense_allocations WHERE id=allocation_40;",
  "  IF v_paid<>70 OR v_status<>'Parzialmente pagato' OR v_alloc_a<>60 OR v_alloc_status_a<>'Pagato' OR v_alloc_b<>10 OR v_alloc_status_b<>'Parzialmente pagato' THEN RAISE EXCEPTION 'Partial reversal distribution mismatch: installment %, allocation A %, allocation B %',v_paid,v_alloc_a,v_alloc_b; END IF;",
  "  PERFORM private.reverse_condominium_installment_payment(w,c,payment_70,'test reversal');",
  "  SELECT paid_amount,status INTO v_paid,v_status FROM public.condominium_installments WHERE id=installment_group;",
  "  SELECT paid_amount,status INTO v_alloc_a,v_alloc_status_a FROM public.condominium_expense_allocations WHERE id=allocation_60;",
  "  SELECT paid_amount,status INTO v_alloc_b,v_alloc_status_b FROM public.condominium_expense_allocations WHERE id=allocation_40;",
  "  IF v_paid<>0 OR v_status<>'Da pagare' OR v_alloc_a<>0 OR v_alloc_status_a<>'Da pagare' OR v_alloc_b<>0 OR v_alloc_status_b<>'Da pagare' THEN RAISE EXCEPTION 'Full reversal failed to clear all allocations: installment %, allocation A %, allocation B %',v_paid,v_alloc_a,v_alloc_b; END IF;",
  "  IF (SELECT count(*) FROM public.condominium_payment_reversal_audit)<>2 THEN RAISE EXCEPTION 'Reversal audit count mismatch'; END IF;",
  "  INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES",
  "    (member_inactive_group,c,null,null,'inactive-owner@example.test',true,'{\"role\":\"Proprietario\"}'::jsonb),",
  "    (member_inactive_unit,c,unit_a,null,'inactive-owner@example.test',true,'{\"role\":\"Proprietario\"}'::jsonb);",
  "  INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,fiscal_year_id,member_id,unit_id,title,due_date,amount,paid_amount,status,ledger_entry_id) VALUES",
  "    (installment_inactive,w,c,y,member_inactive_group,null,'Rata owner inactive','2099-12-31',50,0,'Da pagare',ledger_inactive);",
  "  INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,amount) VALUES",
  "    (allocation_inactive,w,c,ledger_inactive,unit_a,50);",
  "  INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount) VALUES",
  "    (payment_inactive,w,c,installment_inactive,'2026-11-03',50);",
  "  UPDATE public.condominium_members SET active=false WHERE id=member_inactive_group;",
  "  BEGIN",
  "    PERFORM private.reverse_condominium_installment_payment(w,c,payment_inactive,'test inactive owner');",
  "    RAISE EXCEPTION 'Expected inactive consolidated owner reversal to fail';",
  "  EXCEPTION WHEN OTHERS THEN",
  "    IF SQLERRM='Expected inactive consolidated owner reversal to fail' THEN RAISE; END IF;",
  "    IF SQLERRM<>'Proprietario della rata unificata non valido' THEN RAISE EXCEPTION 'Unexpected reversal error: %',SQLERRM; END IF;",
  "  END;",
  "  IF (SELECT count(*) FROM public.condominium_payment_movements WHERE id=payment_inactive)<>1 THEN RAISE EXCEPTION 'Failed reversal deleted the original payment'; END IF;",
  "  SELECT paid_amount,status INTO v_paid,v_status FROM public.condominium_installments WHERE id=installment_inactive;",
  "  SELECT paid_amount,status INTO v_alloc_a,v_alloc_status_a FROM public.condominium_expense_allocations WHERE id=allocation_inactive;",
  "  IF v_paid<>50 OR v_status<>'Pagato' OR v_alloc_a<>50 OR v_alloc_status_a<>'Pagato' THEN RAISE EXCEPTION 'Failed reversal did not preserve original balances'; END IF;",
  "  IF (SELECT count(*) FROM public.condominium_payment_reversal_audit)<>2 THEN RAISE EXCEPTION 'Failed reversal created audit record'; END IF;",
  "END;",
  "$test$;"
].join("\n");

const temporaryDirectory = await mkdtemp(join(tmpdir(), "bethag-payment-reversal-pg-"));
const sqlFile = join(temporaryDirectory, "runtime-regression.sql");
try {
  await writeFile(sqlFile, [setupSql, reverseSql, syncSql, triggerSql, proposedSql, testSql].join("\n"), "utf8");
  console.log("Running proposed payment-reversal forward SQL against a disposable PostgreSQL database...");
  psql(["-f", sqlFile]);
  console.log("PASS: real PostgreSQL runtime regression — consolidated partial/full allocation reset and inactive-owner fail-closed rollback.");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
