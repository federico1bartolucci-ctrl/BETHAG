import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");
const target = new URL(databaseUrl);
assert.ok(["localhost", "127.0.0.1", "::1"].includes(target.hostname), "Only disposable local PostgreSQL is allowed");
assert.equal(target.pathname, "/bethag_installment_allocation_test", "Refusing any database other than the dedicated CI test database");
assert.ok(!/supabase\.co|tctcgptrsmvgajqjgnev|jhuyhlzzydcgghrzeexn/i.test(databaseUrl), "Remote Supabase URL refused");

function psql(sql) {
  return execFileSync("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", "-A", "-t"], {
    input: sql,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}
function psqlAsync(sql, readyMarker = null) {
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const done = new Promise((resolve, reject) => {
    const child = spawn("psql", ["-X", "--no-psqlrc", "--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1"], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
      if (readyMarker && stdout.includes(readyMarker)) resolveReady();
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { resolveReady(); reject(error); });
    child.on("close", (code) => {
      resolveReady();
      code === 0 ? resolve(stdout.trim()) : reject(new Error(`psql exited ${code}: ${stderr || stdout}`));
    });
    child.stdin.end(sql);
  });
  return { ready, done };
}
async function runTwoTransactions(firstSql, secondSql) {
  const first = psqlAsync(firstSql, "BETHAG_LOCK_HELD");
  await first.ready;
  const second = psqlAsync(secondSql);
  await Promise.all([first.done, second.done]);
}
function jsonQuery(sql) {
  const raw = psql(sql);
  return JSON.parse(raw);
}

const migration = await readFile(
  "supabase/rebuild/drafts/20261126131500_reconcile_installment_allocation_paid_totals.sql",
  "utf8",
);

const workspace = "11111111-1111-4111-8111-111111111111";
const condominium = "22222222-2222-4222-8222-222222222222";
const memberGroup = "55555555-5555-4555-8555-555555555555";
const memberA = "66666666-6666-4666-8666-666666666666";
const memberB = "77777777-7777-4777-8777-777777777777";
const unitA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unitB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ledgerRpc = "33333333-3333-4333-8333-333333333333";
const ledgerTrigger = "44444444-4444-4444-8444-444444444444";
const rpcInstallmentA = "dddddddd-dddd-4ddd-8ddd-dddddddd0001";
const rpcInstallmentB = "dddddddd-dddd-4ddd-8ddd-dddddddd0002";
const triggerInstallmentA = "dddddddd-dddd-4ddd-8ddd-dddddddd0003";
const triggerInstallmentB = "dddddddd-dddd-4ddd-8ddd-dddddddd0004";
const triggerPaymentA = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0001";
const triggerPaymentB = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0002";
const rpcAllocationA = "ffffffff-ffff-4fff-8fff-ffffffff0001";
const rpcAllocationB = "ffffffff-ffff-4fff-8fff-ffffffff0002";
const triggerAllocationA = "ffffffff-ffff-4fff-8fff-ffffffff0003";
const triggerAllocationB = "ffffffff-ffff-4fff-8fff-ffffffff0004";

const setup = `
CREATE SCHEMA private;
CREATE FUNCTION private.can_manage_workspace_module(uuid,text)
RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
CREATE TABLE public.condominiums (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL, archived_at timestamptz
);
CREATE TABLE public.condominium_fiscal_years (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL,
  status text NOT NULL, start_date date NOT NULL, end_date date NOT NULL
);
CREATE TABLE public.condominium_members (
  id uuid PRIMARY KEY, condominium_id uuid NOT NULL, unit_id uuid, user_id uuid,
  email text, active boolean NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.condominium_installments (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL,
  amount numeric NOT NULL, due_date date NOT NULL, unit_id uuid, member_id uuid,
  paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare',
  ledger_entry_id uuid, fiscal_year_id uuid
);
CREATE TABLE public.condominium_payment_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL, installment_id uuid NOT NULL, payment_date date NOT NULL,
  amount numeric NOT NULL, method text NOT NULL DEFAULT 'Bonifico',
  reference text DEFAULT '', notes text DEFAULT ''
);
CREATE TABLE public.condominium_expense_allocations (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL,
  ledger_entry_id uuid NOT NULL, unit_id uuid, member_id uuid, amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'Da pagare'
);
`;
psql(setup);
psql(migration);
psql(`CREATE TRIGGER trg_sync_installment_from_payments
AFTER INSERT OR UPDATE OR DELETE ON public.condominium_payment_movements
FOR EACH ROW EXECUTE FUNCTION public.sync_condominium_installment_from_payments();`);

psql(`
INSERT INTO public.condominium_members(id,condominium_id,unit_id,user_id,email,active,data) VALUES
('${memberGroup}','${condominium}',null,null,'shared-owner@example.test',true,'{"role":"Proprietario"}'),
('${memberA}','${condominium}','${unitA}',null,'shared-owner@example.test',true,'{"role":"Proprietario"}'),
('${memberB}','${condominium}','${unitB}',null,'shared-owner@example.test',true,'{"role":"Proprietario"}');
INSERT INTO public.condominium_installments(id,workspace_id,condominium_id,amount,due_date,unit_id,member_id,ledger_entry_id) VALUES
('${rpcInstallmentA}','${workspace}','${condominium}',100,'2099-12-31',null,'${memberGroup}','${ledgerRpc}'),
('${rpcInstallmentB}','${workspace}','${condominium}',100,'2099-12-31',null,'${memberGroup}','${ledgerRpc}'),
('${triggerInstallmentA}','${workspace}','${condominium}',100,'2099-12-31',null,'${memberGroup}','${ledgerTrigger}'),
('${triggerInstallmentB}','${workspace}','${condominium}',100,'2099-12-31',null,'${memberGroup}','${ledgerTrigger}');
INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,member_id,amount) VALUES
('${rpcAllocationA}','${workspace}','${condominium}','${ledgerRpc}','${unitA}',null,50),
('${rpcAllocationB}','${workspace}','${condominium}','${ledgerRpc}','${unitB}',null,50),
('${triggerAllocationA}','${workspace}','${condominium}','${ledgerTrigger}','${unitA}',null,50),
('${triggerAllocationB}','${workspace}','${condominium}','${ledgerTrigger}','${unitB}',null,50);
`);

const rpcCallA = `BEGIN;
SELECT private.register_condominium_installment_payment('${workspace}','${condominium}','${rpcInstallmentA}','2026-11-26',50,'Bonifico','','');
SELECT 'BETHAG_LOCK_HELD';
SELECT pg_sleep(1);
COMMIT;`;
const rpcCallB = `BEGIN;
SELECT private.register_condominium_installment_payment('${workspace}','${condominium}','${rpcInstallmentB}','2026-11-26',50,'Bonifico','','');
COMMIT;`;
await runTwoTransactions(rpcCallA, rpcCallB);

const rpcAllocations = jsonQuery(`SELECT json_agg(paid_amount::float8 ORDER BY id) FROM public.condominium_expense_allocations WHERE ledger_entry_id='${ledgerRpc}';`);
assert.deepEqual(rpcAllocations, [50, 50], "Concurrent manual RPC payments must reconcile cumulative allocations to 50/50");
const rpcInstallments = jsonQuery(`SELECT json_agg(paid_amount::float8 ORDER BY id) FROM public.condominium_installments WHERE ledger_entry_id='${ledgerRpc}';`);
assert.deepEqual(rpcInstallments, [50, 50], "Concurrent manual RPC payments must persist both installment balances");

const triggerInsertA = `BEGIN;
INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount)
VALUES('${triggerPaymentA}','${workspace}','${condominium}','${triggerInstallmentA}','2026-11-26',50);
SELECT 'BETHAG_LOCK_HELD';
SELECT pg_sleep(1);
COMMIT;`;
const triggerInsertB = `BEGIN;
INSERT INTO public.condominium_payment_movements(id,workspace_id,condominium_id,installment_id,payment_date,amount)
VALUES('${triggerPaymentB}','${workspace}','${condominium}','${triggerInstallmentB}','2026-11-26',50);
COMMIT;`;
await runTwoTransactions(triggerInsertA, triggerInsertB);

const triggerAllocations = jsonQuery(`SELECT json_agg(paid_amount::float8 ORDER BY id) FROM public.condominium_expense_allocations WHERE ledger_entry_id='${ledgerTrigger}';`);
assert.deepEqual(triggerAllocations, [50, 50], "Concurrent trigger-driven payments must reconcile cumulative allocations to 50/50");

psql(`DELETE FROM public.condominium_payment_movements WHERE id='${triggerPaymentB}';`);
const reversedAllocations = jsonQuery(`SELECT json_agg(paid_amount::float8 ORDER BY id) FROM public.condominium_expense_allocations WHERE ledger_entry_id='${ledgerTrigger}';`);
assert.deepEqual(reversedAllocations, [50, 0], "A trigger-driven payment reversal must clear the later allocation tail");

console.log("PASS: concurrent manual payment RPC calls across installments serialize on the ledger advisory lock");
console.log("PASS: concurrent trigger-driven payment inserts reconcile cumulative allocations");
console.log("PASS: payment reversal clears stale allocation tail on PostgreSQL 17");
