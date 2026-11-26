import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = "supabase/rebuild/drafts/20261126131500_reconcile_installment_allocation_paid_totals.sql";
const migration = await readFile(migrationPath, "utf8");

function extractFunction(prefix) {
  const start = migration.indexOf(prefix);
  assert.ok(start >= 0, `Forward migration is missing ${prefix}`);
  const next = migration.indexOf("CREATE OR REPLACE FUNCTION", start + prefix.length);
  const end = next >= 0 ? next : migration.indexOf("COMMIT;", start);
  assert.ok(end > start, `Could not isolate ${prefix}`);
  return migration.slice(start, end).trim();
}

const syncSql = extractFunction("CREATE OR REPLACE FUNCTION public.sync_condominium_installment_from_payments()");
const registerSql = extractFunction("CREATE OR REPLACE FUNCTION private.register_condominium_installment_payment(");


for (const [name, sql] of [["payment trigger", syncSql], ["manual payment RPC", registerSql]]) {
  const lock = sql.indexOf("pg_advisory_xact_lock");
  const rowLock = sql.toLowerCase().indexOf("for update");
  assert.ok(lock >= 0 && rowLock > lock, `${name} must acquire the ledger advisory lock before row locks`);
  assert.match(sql, /hashtextextended/);
  assert.match(sql, /ledger_entry_id/);
  assert.doesNotMatch(sql, /exit\s+when\s+v_remaining\s*<=\s*0\.005\s*;/i,
    `${name} must continue through all allocation rows so reversals clear the stale tail`);
  assert.match(sql, /sum\(i\.paid_amount\)/,
    `${name} must reconcile cumulative paid amounts across installments`);
}

const db = new PGlite();
const workspace = "11111111-1111-4111-8111-111111111111";
const condominium = "22222222-2222-4222-8222-222222222222";
const ledgerUnified = "33333333-3333-4333-8333-333333333333";
const ledgerUnit = "44444444-4444-4444-8444-444444444444";
const groupMember = "55555555-5555-4555-8555-555555555555";
const memberA = "66666666-6666-4666-8666-666666666666";
const memberB = "77777777-7777-4777-8777-777777777777";
const memberC = "88888888-8888-4888-8888-888888888888";
const memberD = "99999999-9999-4999-8999-999999999999";
const unitA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unitB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const unitC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const installment1 = "dddddddd-dddd-4ddd-8ddd-dddddddd0001";
const installment2 = "dddddddd-dddd-4ddd-8ddd-dddddddd0002";
const installment3 = "dddddddd-dddd-4ddd-8ddd-dddddddd0003";
const installment4 = "dddddddd-dddd-4ddd-8ddd-dddddddd0004";
const payment1 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0001";
const payment2 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0002";
const payment3 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0003";
const payment4 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0004";
const payment5 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0005";
const payment6 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0006";
const payment7 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0007";
const allocation1 = "ffffffff-ffff-4fff-8fff-ffffffff0001";
const allocation2 = "ffffffff-ffff-4fff-8fff-ffffffff0002";
const allocation3 = "ffffffff-ffff-4fff-8fff-ffffffff0003";
const allocation4 = "ffffffff-ffff-4fff-8fff-ffffffff0004";
const allocation5 = "ffffffff-ffff-4fff-8fff-ffffffff0005";
const ledgerDuplicateTrigger = "55555555-5555-4555-8555-555555555551";
const ledgerDuplicateRpc = "55555555-5555-4555-8555-555555555552";
const installment5 = "dddddddd-dddd-4ddd-8ddd-dddddddd0005";
const installment6 = "dddddddd-dddd-4ddd-8ddd-dddddddd0006";
const payment8 = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0008";
const allocation6 = "ffffffff-ffff-4fff-8fff-ffffffff0006";
const allocation7 = "ffffffff-ffff-4fff-8fff-ffffffff0007";
const allocation8 = "ffffffff-ffff-4fff-8fff-ffffffff0008";
const allocation9 = "ffffffff-ffff-4fff-8fff-ffffffff0009";

async function checkInstallments(ledger, expectedPaid, expectedStatuses) {
  const result = await db.query(
    "SELECT paid_amount::numeric AS paid,status FROM public.condominium_installments WHERE ledger_entry_id=$1 ORDER BY id",
    [ledger],
  );
  assert.deepEqual(result.rows.map((row) => Number(row.paid)), expectedPaid);
  assert.deepEqual(result.rows.map((row) => row.status), expectedStatuses);
}
async function checkAllocations(ledger, expectedPaid, expectedStatuses) {
  const result = await db.query(
    "SELECT paid_amount::numeric AS paid,status FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1 ORDER BY id",
    [ledger],
  );
  assert.deepEqual(result.rows.map((row) => Number(row.paid)), expectedPaid);
  assert.deepEqual(result.rows.map((row) => row.status), expectedStatuses);
}
async function addPayment(id, installment, amount, day) {
  await db.query(
    "INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount,method,reference,notes) VALUES($1,$2,$3,$4,$5,$6,'Bonifico','','')",
    [id, workspace, condominium, installment, `2026-11-${String(day).padStart(2, "0")}`, amount],
  );
}
async function reversePayment(id) {
  await db.query("DELETE FROM public.condominium_payment_movements WHERE id=$1", [id]);
}

try {
  await db.exec([
    "CREATE SCHEMA private;",
    "CREATE TABLE public.condominiums (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, archived_at timestamptz);",
    "CREATE TABLE public.condominium_fiscal_years (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, status text NOT NULL, start_date date, end_date date);",
    "CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(p_workspace_id uuid, p_module text) RETURNS boolean LANGUAGE sql STABLE AS 'SELECT true';",
    "CREATE TABLE public.condominium_members (id uuid PRIMARY KEY, condominium_id uuid NOT NULL, unit_id uuid, user_id uuid, email text, active boolean NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb);",
    "CREATE TABLE public.condominium_installments (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, amount numeric NOT NULL, due_date date NOT NULL, unit_id uuid, member_id uuid, fiscal_year_id uuid, paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare', ledger_entry_id uuid);",
    "CREATE TABLE public.condominium_payment_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, installment_id uuid NOT NULL, payment_date date NOT NULL, amount numeric NOT NULL, method text NOT NULL DEFAULT 'Bonifico', reference text DEFAULT '', notes text DEFAULT '');",
    "CREATE TABLE public.condominium_expense_allocations (id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, ledger_entry_id uuid NOT NULL, unit_id uuid, member_id uuid, amount numeric NOT NULL, paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare');",
  ].join("\n"));
  await db.exec(syncSql);
  await db.exec(registerSql);
  await db.exec(
    "CREATE TRIGGER trg_sync_installment_from_payments AFTER INSERT OR UPDATE OR DELETE ON public.condominium_payment_movements FOR EACH ROW EXECUTE FUNCTION public.sync_condominium_installment_from_payments();",
  );
  await db.query("INSERT INTO public.condominiums(id,workspace_id,archived_at) VALUES($1,$2,NULL)", [condominium, workspace]);

  await db.query(
    "INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES($1,$2,null,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($4,$2,$5,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($6,$2,$7,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($8,$2,$9,null,$3,true,'{\"role\":\"Proprietario\"}'::jsonb),($10,$2,$5,null,'other-owner@example.test',true,'{\"role\":\"Proprietario\"}'::jsonb)",
    [groupMember, condominium, "shared-owner@example.test", memberA, unitA, memberB, unitB, memberC, unitC, memberD],
  );

  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,amount,due_date,unit_id,member_id,ledger_entry_id) VALUES($1,$2,$3,40,'2099-12-31',null,$4,$5),($6,$2,$3,60,'2099-12-31',null,$4,$5),($7,$2,$3,30,'2099-12-31',$8,$9,$10),($11,$2,$3,70,'2099-12-31',$8,$9,$10)",
    [installment1, workspace, condominium, groupMember, ledgerUnified, installment2, installment3, unitA, memberA, ledgerUnit, installment4],
  );

  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES($1,$2,$3,$4,$5,null,50),($6,$2,$3,$4,$7,null,30),($8,$2,$3,$4,$9,null,20),($10,$2,$3,$11,$5,$12,100),($13,$2,$3,$11,$5,$14,40)",
    [allocation1, workspace, condominium, ledgerUnified, unitA, allocation2, unitB, allocation3, unitC, allocation4, ledgerUnit, memberA, allocation5, memberD],
  );


  // Multiple allocation rows for the same non-unified unit/member must receive
  // the cumulative payment sequentially, not each receive the full same total.
  await db.query(
    "INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,amount,due_date,unit_id,member_id,ledger_entry_id) VALUES($1,$2,$3,100,'2099-12-31',$4,$5,$6),($7,$2,$3,100,'2099-12-31',$4,$5,$8)",
    [installment5, workspace, condominium, unitA, memberA, ledgerDuplicateTrigger, installment6, ledgerDuplicateRpc],
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES($1,$2,$3,$4,$5,$6,60),($7,$2,$3,$4,$5,$6,40),($8,$2,$3,$9,$5,$6,60),($10,$2,$3,$9,$5,$6,40)",
    [allocation6, workspace, condominium, ledgerDuplicateTrigger, unitA, memberA, allocation7, allocation8, ledgerDuplicateRpc, allocation9],
  );

  // Unified-owner case: payments are split over two installments sharing one ledger entry.
  await addPayment(payment1, installment1, 40, 1);
  await checkInstallments(ledgerUnified, [40, 0], ["Pagato", "Da pagare"]);
  await checkAllocations(ledgerUnified, [40, 0, 0], ["Parzialmente pagato", "Da pagare", "Da pagare"]);

  await addPayment(payment2, installment2, 20, 2);
  await checkInstallments(ledgerUnified, [40, 20], ["Pagato", "Parzialmente pagato"]);
  await checkAllocations(ledgerUnified, [50, 10, 0], ["Pagato", "Parzialmente pagato", "Da pagare"]);

  await addPayment(payment3, installment2, 20, 3);
  await addPayment(payment4, installment2, 20, 4);
  await checkInstallments(ledgerUnified, [40, 60], ["Pagato", "Pagato"]);
  await checkAllocations(ledgerUnified, [50, 30, 20], ["Pagato", "Pagato", "Pagato"]);

  // Reverse later payments one by one: cumulative totals must shrink and clear stale tail allocations.
  await reversePayment(payment4);
  await checkAllocations(ledgerUnified, [50, 30, 0], ["Pagato", "Pagato", "Da pagare"]);
  await reversePayment(payment3);
  await checkAllocations(ledgerUnified, [50, 10, 0], ["Pagato", "Parzialmente pagato", "Da pagare"]);
  await reversePayment(payment2);
  await checkAllocations(ledgerUnified, [40, 0, 0], ["Parzialmente pagato", "Da pagare", "Da pagare"]);
  await reversePayment(payment1);
  await checkInstallments(ledgerUnified, [0, 0], ["Da pagare", "Da pagare"]);
  await checkAllocations(ledgerUnified, [0, 0, 0], ["Da pagare", "Da pagare", "Da pagare"]);

  // Unit/member-specific case: cumulative totals must not leak to another owner on the same unit.
  await addPayment(payment5, installment3, 30, 5);
  await addPayment(payment6, installment4, 20, 6);
  await addPayment(payment7, installment4, 50, 7);
  await checkInstallments(ledgerUnit, [30, 70], ["Pagato", "Pagato"]);
  await checkAllocations(ledgerUnit, [100, 0], ["Pagato", "Da pagare"]);
  await reversePayment(payment7);
  await checkAllocations(ledgerUnit, [50, 0], ["Parzialmente pagato", "Da pagare"]);
  await reversePayment(payment6);
  await checkAllocations(ledgerUnit, [30, 0], ["Parzialmente pagato", "Da pagare"]);
  await reversePayment(payment5);
  await checkInstallments(ledgerUnit, [0, 0], ["Da pagare", "Da pagare"]);
  await checkAllocations(ledgerUnit, [0, 0], ["Da pagare", "Da pagare"]);


  // Trigger-only path: two rows for the same unit/member, partial payment 70.
  await addPayment(payment8, installment5, 70, 8);
  await checkInstallments(ledgerDuplicateTrigger, [70], ["Parzialmente pagato"]);
  await checkAllocations(ledgerDuplicateTrigger, [60, 10], ["Pagato", "Parzialmente pagato"]);
  await reversePayment(payment8);
  await checkInstallments(ledgerDuplicateTrigger, [0], ["Da pagare"]);
  await checkAllocations(ledgerDuplicateTrigger, [0, 0], ["Da pagare", "Da pagare"]);

  // Manual RPC path must produce the same sequential allocation distribution.
  const rpcPayment = await db.query(
    "SELECT private.register_condominium_installment_payment($1,$2,$3,$4,$5)::numeric AS paid",
    [workspace, condominium, installment6, "2026-11-09", 70],
  );
  assert.equal(Number(rpcPayment.rows[0].paid), 70);
  await checkInstallments(ledgerDuplicateRpc, [70], ["Parzialmente pagato"]);
  await checkAllocations(ledgerDuplicateRpc, [60, 10], ["Pagato", "Parzialmente pagato"]);
  const rpcMovement = await db.query(
    "SELECT id FROM public.condominium_payment_movements WHERE installment_id=$1",
    [installment6],
  );
  assert.equal(rpcMovement.rows.length, 1);
  await reversePayment(rpcMovement.rows[0].id);
  await checkInstallments(ledgerDuplicateRpc, [0], ["Da pagare"]);
  await checkAllocations(ledgerDuplicateRpc, [0, 0], ["Da pagare", "Da pagare"]);

  console.log("PASS: duplicate unit/member allocations receive cumulative payments sequentially in both trigger and RPC paths.");

  console.log("PASS: cumulative allocation paid totals across multiple installments");
  console.log("PASS: payment reversals recalculate all allocations and clear stale tail amounts");
  console.log("PASS: unit/member-specific payments do not leak to another owner");
} finally {
  await db.close();
}
