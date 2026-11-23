import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261123130000_guard_consolidated_installment_reconciliation.sql";
const securityPath = "supabase/migrations/20261017000004_bethag_baseline_security.sql";
const migrationSource = await readFile(migrationPath, "utf8");
const securitySource = await readFile(securityPath, "utf8");

function extractFunction(source, signature) {
  const start = source.indexOf("CREATE OR REPLACE FUNCTION " + signature + "(");
  assert.notEqual(start, -1, "Migration is missing function " + signature);
  const marker = "AS $function$";
  const delimiter = "$function$";
  const bodyStart = source.indexOf(marker, start);
  assert.notEqual(bodyStart, -1, "Function has no dollar-quoted body: " + signature);
  const bodyEnd = source.indexOf(delimiter, bodyStart + marker.length);
  assert.notEqual(bodyEnd, -1, "Function body is not closed: " + signature);
  return source.slice(start, bodyEnd + delimiter.length).trimEnd() + ";";
}

const migrationSql = extractFunction(migrationSource, "public.sync_condominium_installment_from_payments");
assert.match(migrationSql, /pg_catalog\.pg_advisory_xact_lock/, "Reconciliation must serialize by workspace/condominium/ledger before installment locks.");
assert.match(migrationSql, /sum\(i\.paid_amount\)/, "Reconciliation must aggregate paid amounts across installments.");
assert.match(migrationSql, /if\s+not\s+found\s+then\s+raise\s+exception\s+'Il proprietario della rata unificata/i, "Inactive/missing consolidated owner must fail closed.");
assert.match(migrationSql, /v_remaining\s*>\s*0\.005/i, "Residual reconciliation guard must remain.");
assert.doesNotMatch(migrationSql, /exit\s+when\s+v_remaining\s*<=\s*0\.005\s*;/i, "Every allocation must be reset after the remainder reaches zero.");
const canonicalFiles = await readdir("supabase/migrations");
assert.ok(!canonicalFiles.includes("20261123130000_guard_consolidated_installment_reconciliation.sql"), "Proposed forward migration must not enter the frozen canonical chain.");

const triggerSql = securitySource.split("\n").find((line) => line.includes("CREATE TRIGGER trg_sync_installment_from_payments"));
assert.ok(triggerSql, "Baseline trigger must wire payment movements to allocation synchronization.");

const db = new PGlite();
const workspace = "11111111-1111-4111-8111-111111111111";
const condominium = "22222222-2222-4222-8222-222222222222";
const ledgerConsolidated = "55555555-5555-4555-8555-555555555555";
const installmentA = "66666666-6666-4666-8666-666666666666";
const installmentB = "77777777-7777-4777-8777-777777777777";
const groupMember = "88888888-8888-4888-8888-888888888888";
const ownerA = "99999999-9999-4999-8999-999999999999";
const ownerB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerC = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const unitA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const unitB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const unitC = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const allocationA = "01010101-0101-4101-8101-010101010101";
const allocationB = "02020202-0202-4202-8202-020202020202";
const allocationC = "03030303-0303-4303-8303-030303030303";
const paymentA = "f1111111-1111-4111-8111-111111111111";
const paymentB = "f2222222-2222-4222-8222-222222222222";
const groupMemberInactive = "12121212-1212-4121-8121-121212121212";
const ownerInactiveUnit = "13131313-1313-4131-8131-131313131313";
const ledgerInactive = "14141414-1414-4141-8141-141414141414";
const installmentInactive = "15151515-1515-4151-8151-151515151515";
const allocationInactive = "16161616-1616-4161-8161-161616161616";
const paymentInactive = "17171717-1717-4171-8171-171717171717";
const groupMemberResidual = "18181818-1818-4181-8181-181818181818";
const ownerResidualA = "19191919-1919-4191-8191-191919191919";
const ownerResidualB = "20202020-2020-4202-8202-202020202020";
const unitResidualA = "21212121-2121-4212-8212-212121212121";
const unitResidualB = "22222222-2222-4222-8222-222222222223";
const ledgerResidual = "23232323-2323-4232-8232-232323232323";
const installmentResidual = "24242424-2424-4242-8242-242424242424";
const allocationResidualA = "25252525-2525-4252-8252-252525252525";
const allocationResidualB = "26262626-2626-4262-8262-262626262626";
const paymentResidual = "27272727-2727-4272-8272-272727272727";
const tenantMember = "28282828-2828-4282-8282-282828282828";
const ledgerUnit = "29292929-2929-4292-8292-292929292929";
const installmentUnitA = "30303030-3030-4303-8303-303030303030";
const installmentUnitB = "31313131-3131-4313-8313-313131313131";
const allocationUnit = "32323232-3232-4323-8323-323232323232";
const paymentUnitA = "33333333-3333-4333-8333-333333333333";
const paymentUnitB = "34343434-3434-4343-8343-343434343434";

async function checkAllocations(ledger, paid, statuses) {
  const result = await db.query("SELECT paid_amount::numeric AS paid,status FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1 ORDER BY id", [ledger]);
  assert.deepEqual(result.rows.map((row) => Number(row.paid)), paid);
  assert.deepEqual(result.rows.map((row) => row.status), statuses);
}
async function checkInstallment(id, paid, status) {
  const result = await db.query("SELECT paid_amount::numeric AS paid,status FROM public.condominium_installments WHERE id=$1", [id]);
  assert.equal(result.rows.length, 1);
  assert.equal(Number(result.rows[0].paid), paid);
  assert.equal(result.rows[0].status, status);
}
async function addPayment(id, installment, amount) {
  return db.query("INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount,method,reference,notes) VALUES($1,$2,$3,$4,'2026-11-01',$5,'Bonifico','','')", [id, workspace, condominium, installment, amount]);
}
async function deletePayment(id) {
  return db.query("DELETE FROM public.condominium_payment_movements WHERE id=$1", [id]);
}

try {
  await db.exec([
    "CREATE TABLE public.condominium_members (id uuid PRIMARY KEY, condominium_id uuid NOT NULL, unit_id uuid, user_id uuid, email text, active boolean NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb);",
    "CREATE TABLE public.condominium_installments (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, amount numeric NOT NULL, due_date date NOT NULL, unit_id uuid, member_id uuid, paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare', ledger_entry_id uuid);",
    "CREATE TABLE public.condominium_payment_movements (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, installment_id uuid NOT NULL, payment_date date NOT NULL, amount numeric NOT NULL, method text NOT NULL DEFAULT 'Bonifico', reference text DEFAULT '', notes text DEFAULT '');",
    "CREATE TABLE public.condominium_expense_allocations (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, ledger_entry_id uuid NOT NULL, unit_id uuid, member_id uuid, amount numeric NOT NULL, paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare');"
  ].join("\n"));
  await db.exec(migrationSql);
  await db.exec(triggerSql);

  // Consolidated owner installments: aggregate all installments and reset every allocation.
  const email1 = "consolidated-owner-1@example.test";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($4,$2,$5,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($6,$2,$7,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($8,$2,$9,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb)",
    [groupMember, condominium, email1, ownerA, unitA, ownerB, unitB, ownerC, unitC]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,member_id,unit_id,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,null,'2099-12-31',70,0,'Da pagare',$5),($6,$2,$3,$4,null,'2099-12-31',30,0,'Da pagare',$5)",
    [installmentA, workspace, condominium, groupMember, ledgerConsolidated, installmentB]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES($1,$2,$3,$4,$5,null,50),($6,$2,$3,$4,$7,null,30),($8,$2,$3,$4,$9,null,20)",
    [allocationA, workspace, condominium, ledgerConsolidated, unitA, allocationB, unitB, allocationC, unitC]
  );
  await addPayment(paymentA, installmentA, 70);
  await checkInstallment(installmentA, 70, "Pagato");
  await checkAllocations(ledgerConsolidated, [50,20,0], ["Pagato","Parzialmente pagato","Da pagare"]);
  await addPayment(paymentB, installmentB, 30);
  await checkInstallment(installmentB, 30, "Pagato");
  await checkAllocations(ledgerConsolidated, [50,30,20], ["Pagato","Pagato","Pagato"]);
  await deletePayment(paymentB);
  await checkAllocations(ledgerConsolidated, [50,20,0], ["Pagato","Parzialmente pagato","Da pagare"]);
  await deletePayment(paymentA);
  await checkInstallment(installmentA, 0, "Da pagare");
  await checkAllocations(ledgerConsolidated, [0,0,0], ["Da pagare","Da pagare","Da pagare"]);

  // An inactive consolidated owner must rollback payment and installment changes.
  const email2 = "consolidated-owner-inactive@example.test";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,false,'{\"role\":\"Proprietario\"}'::jsonb),($4,$2,$5,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb)",
    [groupMemberInactive, condominium, email2, ownerInactiveUnit, unitA]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,member_id,unit_id,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,null,'2099-12-31',40,0,'Da pagare',$5)",
    [installmentInactive, workspace, condominium, groupMemberInactive, ledgerInactive]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES($1,$2,$3,$4,$5,null,40)",
    [allocationInactive, workspace, condominium, ledgerInactive, unitA]
  );
  await assert.rejects(() => addPayment(paymentInactive, installmentInactive, 20), /proprietario.*non.*attivo|non.*valido/i);
  const inactiveMovement = await db.query("SELECT id FROM public.condominium_payment_movements WHERE id=$1", [paymentInactive]);
  assert.equal(inactiveMovement.rows.length, 0);
  await checkInstallment(installmentInactive, 0, "Da pagare");
  await checkAllocations(ledgerInactive, [0], ["Da pagare"]);

  // Insufficient allocations must raise and rollback the movement and paid amount.
  const email3 = "consolidated-owner-residual@example.test";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($4,$2,$5,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($6,$2,$7,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb)",
    [groupMemberResidual, condominium, email3, ownerResidualA, unitResidualA, ownerResidualB, unitResidualB]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,member_id,unit_id,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,null,'2099-12-31',100,0,'Da pagare',$5)",
    [installmentResidual, workspace, condominium, groupMemberResidual, ledgerResidual]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES($1,$2,$3,$4,$5,null,50),($6,$2,$3,$4,$7,null,30)",
    [allocationResidualA, workspace, condominium, ledgerResidual, unitResidualA, allocationResidualB, unitResidualB]
  );
  await assert.rejects(() => addPayment(paymentResidual, installmentResidual, 100), /saldo.*interamente riconciliato/i);
  const residualMovement = await db.query("SELECT id FROM public.condominium_payment_movements WHERE id=$1", [paymentResidual]);
  assert.equal(residualMovement.rows.length, 0);
  await checkInstallment(installmentResidual, 0, "Da pagare");
  await checkAllocations(ledgerResidual, [0,0], ["Da pagare","Da pagare"]);

  // Non-consolidated unit/member allocation aggregates across every installment on the ledger.
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,$3,null,'tenant@example.test',true,'{\"role\":\"Inquilino\"}'::jsonb)",
    [tenantMember, condominium, unitResidualA]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,member_id,unit_id,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,$5,'2099-12-31',70,0,'Da pagare',$6),($7,$2,$3,$4,$5,'2099-12-31',30,0,'Da pagare',$6)",
    [installmentUnitA, workspace, condominium, tenantMember, unitResidualA, ledgerUnit, installmentUnitB]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES($1,$2,$3,$4,$5,$6,100)",
    [allocationUnit, workspace, condominium, ledgerUnit, unitResidualA, tenantMember]
  );
  await addPayment(paymentUnitA, installmentUnitA, 70);
  await checkAllocations(ledgerUnit, [70], ["Parzialmente pagato"]);
  await addPayment(paymentUnitB, installmentUnitB, 30);
  await checkAllocations(ledgerUnit, [100], ["Pagato"]);
  await deletePayment(paymentUnitB);
  await checkAllocations(ledgerUnit, [70], ["Parzialmente pagato"]);
  await deletePayment(paymentUnitA);
  await checkAllocations(ledgerUnit, [0], ["Da pagare"]);

  console.log("PASS: proposed-forward reconciliation runtime — consolidated multi-installment sums, reversal tail reset, inactive-owner rollback, residual rollback, and non-consolidated aggregation.");
} finally {
  await db.close();
}
