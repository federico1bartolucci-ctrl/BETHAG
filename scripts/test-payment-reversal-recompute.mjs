import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const functionsPath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const securityPath = "supabase/migrations/20261017000004_bethag_baseline_security.sql";
const proposedMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261122200000_reset_all_consolidated_allocations_after_payment_reversal.sql";
const functionsSource = await readFile(functionsPath, "utf8");
const securitySource = await readFile(securityPath, "utf8");
const proposedMigrationSql = await readFile(proposedMigrationPath, "utf8");

function extractProductionFunction(source, signature) {
  const start = source.indexOf("CREATE OR REPLACE FUNCTION " + signature + "(");
  assert.notEqual(start, -1, "Production baseline is missing function " + signature);
  const marker = "AS $function$";
  const delimiter = "$function$";
  const bodyStart = source.indexOf(marker, start);
  assert.notEqual(bodyStart, -1, "Production function has no dollar-quoted body: " + signature);
  const bodyEnd = source.indexOf(delimiter, bodyStart + marker.length);
  assert.notEqual(bodyEnd, -1, "Production function body is not closed: " + signature);
  return source.slice(start, bodyEnd + delimiter.length).trimEnd() + ";";
}

const reverseSql = extractProductionFunction(functionsSource, "private.reverse_condominium_installment_payment");
const syncSql = extractProductionFunction(functionsSource, "public.sync_condominium_installment_from_payments");
const triggerSql = securitySource.split("\n").find((line) =>
  line.includes("CREATE TRIGGER trg_sync_installment_from_payments")
);
assert.ok(triggerSql, "Production baseline must wire payment movements to installment/allocation synchronization.");
assert.match(proposedMigrationSql, /CREATE OR REPLACE FUNCTION public\\.sync_condominium_installment_from_payments/);
assert.doesNotMatch(proposedMigrationSql, /exit when v_remaining<=0\\.005;/, "Proposed migration must clear every matching allocation, including later rows.");

const db = new PGlite();
const workspace = "11111111-1111-4111-8111-111111111111";
const otherWorkspace = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const condo = "22222222-2222-4222-8222-222222222222";
const openYear = "33333333-3333-4333-8333-333333333333";
const closedYear = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ledger = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const unitA = "66666666-6666-4666-8666-666666666666";
const unitB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const installment = "77777777-7777-4777-8777-777777777777";
const p1 = "88888888-8888-4888-8888-888888888888";
const p2 = "99999999-9999-4999-8999-999999999999";
const p3 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const allocation = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const groupMember = "12121212-1212-4121-8121-121212121212";
const groupInstallment = "13131313-1313-4131-8131-131313131313";
const groupLedger = "14141414-1414-4141-8141-141414141414";
const groupPayment1 = "15151515-1515-4151-8151-151515151515";
const groupPayment2 = "16161616-1616-4161-8161-161616161616";
const allocationA = "17171717-1717-4171-8171-171717171717";
const allocationB = "18181818-1818-4181-8181-181818181818";
const closedInstallment = "19191919-1919-4191-8191-191919191919";
const closedPayment = "20202020-2020-4202-8202-202020202020";

async function setAuth(id) {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function setManage(enabled) {
  await db.query("SELECT set_config('bethag.test.manage', $1, false)", [enabled ? "on" : "off"]);
}
async function insertPayment(id, installmentId, amount, paymentDate = "2026-11-01") {
  await db.query(
    "INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount,method,reference,notes) VALUES($1,$2,$3,$4,$5,$6,'Bonifico','','')",
    [id, workspace, condo, installmentId, paymentDate, amount]
  );
}
async function checkInstallment(id, paid, status) {
  const result = await db.query(
    "SELECT paid_amount::numeric AS paid,status FROM public.condominium_installments WHERE id=$1",
    [id]
  );
  assert.equal(result.rows.length, 1);
  assert.equal(Number(result.rows[0].paid), paid);
  assert.equal(result.rows[0].status, status);
}
async function checkAllocations(ledgerId, expected) {
  const result = await db.query(
    "SELECT unit_id,paid_amount::numeric AS paid,status FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1 ORDER BY id",
    [ledgerId]
  );
  assert.equal(result.rows.length, expected.length);
  assert.deepEqual(result.rows.map((row) => Number(row.paid)), expected.map((row) => row.paid));
  assert.deepEqual(result.rows.map((row) => row.status), expected.map((row) => row.status));
}
async function auditCount() {
  return Number((await db.query("SELECT count(*)::int AS n FROM public.condominium_payment_reversal_audit")).rows[0].n);
}
async function paymentCount(id) {
  return Number((await db.query("SELECT count(*)::int AS n FROM public.condominium_payment_movements WHERE id=$1", [id])).rows[0].n);
}
async function reverse(id, reason = "runtime regression", workspaceId = workspace, condominiumId = condo) {
  return db.query("SELECT private.reverse_condominium_installment_payment($1,$2,$3,$4)", [workspaceId, condominiumId, id, reason]);
}

try {
  const setupSql = [
    "CREATE SCHEMA auth; CREATE SCHEMA private;",
    "CREATE TABLE public.condominium_fiscal_years(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,status text NOT NULL);",
    "CREATE TABLE public.condominium_installments(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,fiscal_year_id uuid,member_id uuid,unit_id uuid,title text,due_date date NOT NULL,amount numeric NOT NULL,paid_amount numeric NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'Da pagare',ledger_entry_id uuid);",
    "CREATE TABLE public.condominium_payment_movements(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,installment_id uuid NOT NULL,payment_date date NOT NULL,amount numeric NOT NULL,method text NOT NULL DEFAULT 'Bonifico',reference text DEFAULT '',notes text DEFAULT '');",
    "CREATE TABLE public.condominium_payment_reversal_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),original_payment_id uuid UNIQUE NOT NULL,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,installment_id uuid NOT NULL,amount numeric NOT NULL,payment_date date NOT NULL,method text NOT NULL,reference text,notes text,reversal_reason text NOT NULL,reversed_at timestamptz NOT NULL DEFAULT now(),reversed_by uuid NOT NULL);",
    "CREATE TABLE public.condominium_expense_allocations(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,condominium_id uuid NOT NULL,ledger_entry_id uuid NOT NULL,unit_id uuid,member_id uuid,amount numeric NOT NULL,paid_amount numeric NOT NULL DEFAULT 0,status text NOT NULL DEFAULT 'Da pagare');",
    "CREATE TABLE public.condominium_members(id uuid PRIMARY KEY,condominium_id uuid NOT NULL,unit_id uuid,user_id uuid,email text,active boolean NOT NULL,data jsonb NOT NULL DEFAULT '{}'::jsonb);",
    "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULLIF(current_setting(''request.jwt.claim.sub'',true), '''')::uuid';",
    "CREATE FUNCTION private.can_manage_workspace_module(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS 'SELECT current_setting(''bethag.test.manage'',true) = ''on''';"
  ].join("\n");
  await db.exec(setupSql);
  await db.exec(reverseSql);
  await db.exec(syncSql);
  await db.exec(triggerSql);
  await db.exec(proposedMigrationSql);
  await setAuth(userId);
  await setManage(true);

  await db.query("INSERT INTO public.condominium_fiscal_years VALUES($1,$2,$3,'Aperto')", [openYear, workspace, condo]);
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,fiscal_year_id,unit_id,title,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,$5,'Non consolidata','2099-12-31',100,0,'Da pagare',$6)",
    [installment, workspace, condo, openYear, unitA, ledger]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,amount) VALUES($1,$2,$3,$4,$5,100)",
    [allocation, workspace, condo, ledger, unitA]
  );
  await insertPayment(p1, installment, 70);
  await insertPayment(p2, installment, 30);
  await checkInstallment(installment, 100, "Pagato");
  await checkAllocations(ledger, [{ paid: 100, status: "Pagato" }]);

  await assert.rejects(() => reverse(p2, "  "), /motivazione dello storno è obbligatoria/);
  await setAuth("");
  await assert.rejects(() => reverse(p2), /Autenticazione richiesta/);
  await setAuth(userId);
  await setManage(false);
  await assert.rejects(() => reverse(p2), /Autorizzazione gestione contabilità richiesta/);
  await setManage(true);
  await assert.rejects(() => reverse(p2, "wrong workspace", otherWorkspace), /Pagamento non trovato/);
  assert.equal(await paymentCount(p2), 1);
  assert.equal(await auditCount(), 0);

  await reverse(p2);
  await checkInstallment(installment, 70, "Parzialmente pagato");
  await checkAllocations(ledger, [{ paid: 70, status: "Parzialmente pagato" }]);
  assert.equal(await auditCount(), 1);
  await assert.rejects(() => reverse(p2), /Pagamento non trovato/);
  assert.equal(await auditCount(), 1);
  await reverse(p1);
  await checkInstallment(installment, 0, "Da pagare");
  await checkAllocations(ledger, [{ paid: 0, status: "Da pagare" }]);
  assert.equal(await auditCount(), 2);

  await insertPayment(p3, installment, 20);
  await checkInstallment(installment, 20, "Parzialmente pagato");
  await assert.rejects(() => reverse(p3, ""));
  assert.equal(await paymentCount(p3), 1);
  assert.equal(await auditCount(), 2);
  await reverse(p3);
  await checkInstallment(installment, 0, "Da pagare");
  await checkAllocations(ledger, [{ paid: 0, status: "Da pagare" }]);
  assert.equal(await auditCount(), 3);

  await db.query("INSERT INTO public.condominium_fiscal_years VALUES($1,$2,$3,'Chiuso')", [closedYear, workspace, condo]);
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,fiscal_year_id,unit_id,title,due_date,amount,paid_amount,status) VALUES($1,$2,$3,$4,$5,'Esercizio chiuso','2099-12-31',25,0,'Da pagare')",
    [closedInstallment, workspace, condo, closedYear, unitA]
  );
  await insertPayment(closedPayment, closedInstallment, 25);
  await checkInstallment(closedInstallment, 25, "Pagato");
  await assert.rejects(() => reverse(closedPayment), /esercizio contabile è chiuso/);
  assert.equal(await paymentCount(closedPayment), 1);
  assert.equal(await auditCount(), 3);

  const ownerEmail = "consolidated-owner@example.test";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($4,$2,$5,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($6,$2,$7,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb)",
    [groupMember, condo, ownerEmail, "21212121-2121-4212-8212-212121212121", unitA, "23232323-2323-4232-8232-232323232323", unitB]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,fiscal_year_id,member_id,unit_id,title,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,$5,null,'Rata consolidata','2099-12-31',100,0,'Da pagare',$6)",
    [groupInstallment, workspace, condo, openYear, groupMember, groupLedger]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,amount) VALUES($1,$2,$3,$4,$5,60),($6,$2,$3,$4,$7,40)",
    [allocationA, workspace, condo, groupLedger, unitA, allocationB, unitB]
  );
  await insertPayment(groupPayment1, groupInstallment, 70);
  await insertPayment(groupPayment2, groupInstallment, 30);
  await checkInstallment(groupInstallment, 100, "Pagato");
  await checkAllocations(groupLedger, [{ paid: 60, status: "Pagato" }, { paid: 40, status: "Pagato" }]);
  await reverse(groupPayment2);
  await checkInstallment(groupInstallment, 70, "Parzialmente pagato");
  await checkAllocations(groupLedger, [{ paid: 60, status: "Pagato" }, { paid: 10, status: "Parzialmente pagato" }]);
  await reverse(groupPayment1);
  await checkInstallment(groupInstallment, 0, "Da pagare");
  await checkAllocations(groupLedger, [{ paid: 0, status: "Da pagare" }, { paid: 0, status: "Da pagare" }]);
  assert.equal(await auditCount(), 5);

  const inactiveOwnerMember = "24242424-2424-4242-8242-242424242424";
  const inactiveUnitOwner = "29292929-2929-4292-8292-292929292929";
  const inactiveInstallment = "25252525-2525-4252-8252-252525252525";
  const inactiveLedger = "26262626-2626-4262-8262-262626262626";
  const inactivePayment = "27272727-2727-4272-8272-272727272727";
  const inactiveAllocation = "28282828-2828-4282-8282-282828282828";
  const inactiveEmail = "inactive-consolidated-owner@example.test";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,true,'{\\\"role\\\":\\\"Proprietario\\\\"}'::jsonb),($4,$2,$5,null,$3,true,'{\\\\"role\\\\":\\\\"Proprietario\\\\"}'::jsonb)",
    [inactiveOwnerMember, condo, inactiveEmail, inactiveUnitOwner, unitA]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,fiscal_year_id,member_id,unit_id,title,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,$5,null,'Rata proprietario inattivo','2099-12-31',50,0,'Da pagare',$6)",
    [inactiveInstallment, workspace, condo, openYear, inactiveOwnerMember, inactiveLedger]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,amount) VALUES($1,$2,$3,$4,$5,50)",
    [inactiveAllocation, workspace, condo, inactiveLedger, unitA]
  );
  await insertPayment(inactivePayment, inactiveInstallment, 50);
  await checkInstallment(inactiveInstallment, 50, "Pagato");
  await checkAllocations(inactiveLedger, [{ paid: 50, status: "Pagato" }]);
  await db.query("UPDATE public.condominium_members SET active=false WHERE id=$1", [inactiveOwnerMember]);
  await assert.rejects(() => reverse(inactivePayment), /Proprietario della rata unificata non valido/);
  assert.equal(await paymentCount(inactivePayment), 1, "Failed reversal must retain the original payment.");
  await checkInstallment(inactiveInstallment, 50, "Pagato");
  await checkAllocations(inactiveLedger, [{ paid: 50, status: "Pagato" }]);
  assert.equal(await auditCount(), 5, "Failed reversal must roll back its audit row.");

  console.log("PASS: production baseline payment-reversal runtime regression — payment, installment, allocation triggers, auth/scope, audit, closed-year, consolidated-owner reset and inactive-owner fail-closed cases.");
} finally {
  await db.close();
}
