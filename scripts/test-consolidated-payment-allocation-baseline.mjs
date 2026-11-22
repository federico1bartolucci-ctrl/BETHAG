import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const functionsPath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const securityPath = "supabase/migrations/20261017000004_bethag_baseline_security.sql";
const functionsSource = await readFile(functionsPath, "utf8");
const securitySource = await readFile(securityPath, "utf8");

function extractBaselineFunction(source, signature) {
  const start = source.indexOf("CREATE OR REPLACE FUNCTION " + signature + "(");
  assert.notEqual(start, -1, "Baseline is missing function " + signature);
  const marker = "AS $function$";
  const delimiter = "$function$";
  const bodyStart = source.indexOf(marker, start);
  assert.notEqual(bodyStart, -1, "Baseline function has no dollar-quoted body: " + signature);
  const bodyEnd = source.indexOf(delimiter, bodyStart + marker.length);
  assert.notEqual(bodyEnd, -1, "Baseline function body is not closed: " + signature);
  return source.slice(start, bodyEnd + delimiter.length).trimEnd() + ";";
}

const syncSql = extractBaselineFunction(functionsSource, "public.sync_condominium_installment_from_payments");
const triggerSql = securitySource.split("\n").find((line) => line.includes("CREATE TRIGGER trg_sync_installment_from_payments"));
assert.ok(triggerSql, "Baseline must wire payment movements to allocation synchronization.");
assert.doesNotMatch(syncSql, /exit\s+when\s+v_remaining\s*<=\s*0\.005\s*;/i, "Consolidated reconciliation must visit all allocations after the remainder reaches zero.");

const db = new PGlite();
const workspace = "11111111-1111-4111-8111-111111111111";
const condominium = "22222222-2222-4222-8222-222222222222";
const ledger = "55555555-5555-4555-8555-555555555555";
const installment = "66666666-6666-4666-8666-666666666666";
const groupMember = "77777777-7777-4777-8777-777777777777";
const memberA = "88888888-8888-4888-8888-888888888888";
const memberB = "99999999-9999-4999-8999-999999999999";
const memberC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unitA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const unitB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const unitC = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const payment70 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const payment30 = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const allocation50 = "01010101-0101-4101-8101-010101010101";
const allocation30 = "02020202-0202-4202-8202-020202020202";
const allocation20 = "03030303-0303-4303-8303-030303030303";

async function checkAllocations(expectedPaid, expectedStatuses) {
  const result = await db.query("SELECT paid_amount::numeric AS paid,status FROM public.condominium_expense_allocations ORDER BY id");
  assert.deepEqual(result.rows.map((row) => Number(row.paid)), expectedPaid);
  assert.deepEqual(result.rows.map((row) => row.status), expectedStatuses);
}
async function checkInstallment(expectedPaid, expectedStatus) {
  const result = await db.query("SELECT paid_amount::numeric AS paid,status FROM public.condominium_installments WHERE id=$1", [installment]);
  assert.equal(result.rows.length, 1);
  assert.equal(Number(result.rows[0].paid), expectedPaid);
  assert.equal(result.rows[0].status, expectedStatus);
}

try {
  await db.exec([
    "CREATE TABLE public.condominium_members (id uuid PRIMARY KEY, condominium_id uuid NOT NULL, unit_id uuid, user_id uuid, email text, active boolean NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb);",
    "CREATE TABLE public.condominium_installments (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, amount numeric NOT NULL, due_date date NOT NULL, unit_id uuid, member_id uuid, paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare', ledger_entry_id uuid);",
    "CREATE TABLE public.condominium_payment_movements (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, installment_id uuid NOT NULL, payment_date date NOT NULL, amount numeric NOT NULL, method text NOT NULL DEFAULT 'Bonifico', reference text DEFAULT '', notes text DEFAULT '');",
    "CREATE TABLE public.condominium_expense_allocations (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, ledger_entry_id uuid NOT NULL, unit_id uuid, member_id uuid, amount numeric NOT NULL, paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare');"
  ].join("\n"));
  await db.exec(syncSql);
  await db.exec(triggerSql);

  const ownerEmail = "consolidated-owner@example.test";
  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($4,$2,$5,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($6,$2,$7,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($8,$2,$9,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb)",
    [groupMember, condominium, ownerEmail, memberA, unitA, memberB, unitB, memberC, unitC]
  );
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,member_id,unit_id,due_date,amount,paid_amount,status,ledger_entry_id) VALUES($1,$2,$3,$4,null,'2099-12-31',100,0,'Da pagare',$5)",
    [installment, workspace, condominium, groupMember, ledger]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,amount) VALUES($1,$2,$3,$4,$5,50),($6,$2,$3,$4,$7,30),($8,$2,$3,$4,$9,20)",
    [allocation50, workspace, condominium, ledger, unitA, allocation30, unitB, allocation20, unitC]
  );
  await db.query(
    "INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount,method,reference,notes) VALUES($1,$2,$3,$4,'2026-11-01',70,'Bonifico','',''),($5,$2,$3,$4,'2026-11-02',30,'Bonifico','','')",
    [payment70, workspace, condominium, installment, payment30]
  );
  await checkInstallment(100, "Pagato");
  await checkAllocations([50, 30, 20], ["Pagato", "Pagato", "Pagato"]);

  await db.query("DELETE FROM public.condominium_payment_movements WHERE id=$1", [payment30]);
  await checkInstallment(70, "Parzialmente pagato");
  await checkAllocations([50, 20, 0], ["Pagato", "Parzialmente pagato", "Da pagare"]);

  await db.query("DELETE FROM public.condominium_payment_movements WHERE id=$1", [payment70]);
  await checkInstallment(0, "Da pagare");
  await checkAllocations([0, 0, 0], ["Da pagare", "Da pagare", "Da pagare"]);
  console.log("PASS: baseline consolidated-payment allocation runtime regression — three allocations, partial/full reversals, stale-tail reset.");
} finally {
  await db.close();
}
