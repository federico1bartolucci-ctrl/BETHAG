import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baselinePath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261125064000_scope_member_transfer_closure_financial_positions_to_unit.sql";
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(
  packageJson.scripts.test,
  /test-member-transfer-closure-unit-scope\.mjs/,
  "Transfer-closure unit-scope regression must be wired into npm test."
);

const baselineSql = await readFile(baselinePath, "utf8");
function extractPublicFunction(name) {
  const marker = "CREATE OR REPLACE FUNCTION public." + name + "(";
  const start = baselineSql.indexOf(marker);
  const endMarker = "$function$" + String.fromCharCode(10) + ";";
  const end = baselineSql.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, "Exact baseline scope trigger must be present: " + name);
  return baselineSql.slice(start, end + endMarker.length);
}
const installmentScopeTrigger = extractPublicFunction("validate_condominium_installment_scope");
const allocationScopeTrigger = extractPublicFunction("validate_condominium_expense_allocation_scope");
const checkPublicRpc = extractPublicFunction("check_condominium_member_transfer_closure");
const closePublicRpc = extractPublicFunction("close_condominium_member_transfer");
const migrationSql = await readFile(migrationPath, "utf8");
const marker = "CREATE OR REPLACE FUNCTION private.check_condominium_member_transfer_closure(";
const start = baselineSql.indexOf(marker);
const endMarker = "$function$" + String.fromCharCode(10) + ";";
const end = baselineSql.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "Exact baseline transfer-closure function must be present.");
const baselineFunction = baselineSql.slice(start, end + endMarker.length);

const closeMarker = "CREATE OR REPLACE FUNCTION private.close_condominium_member_transfer(";
const closeStart = baselineSql.indexOf(closeMarker);
const closeEnd = baselineSql.indexOf(endMarker, closeStart);
assert.ok(closeStart >= 0 && closeEnd > closeStart, "Exact baseline close function must be present.");
const baselineCloseFunction = baselineSql.slice(closeStart, closeEnd + endMarker.length);

const ids = {
  workspace: "11111111-1111-4111-8111-111111111111",
  condominium: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  unitA: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  unitB: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  memberA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  transfer: "f0000000-0000-4000-8000-000000000001",
  shareTransfer: "f0000000-0000-4000-8000-000000000002"
};

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE SCHEMA private;
    CREATE FUNCTION auth.uid()
      RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT '99999999-9999-4999-8999-999999999999'::uuid $$;
    CREATE FUNCTION private.can_manage_workspace_module(uuid, text)
      RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT true $$;

    CREATE TABLE public.condominiums (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL
    );
    CREATE TABLE public.condominium_units (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL
    );
    CREATE TABLE public.condominium_members (
      id uuid PRIMARY KEY,
      condominium_id uuid NOT NULL,
      active boolean NOT NULL,
      updated_at timestamptz,
      data jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.condominium_fiscal_years (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL
    );
    CREATE TABLE public.condominium_millesimal_tables (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL
    );
    CREATE TABLE public.condominium_ledger_entries (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      direction text NOT NULL
    );

    CREATE TABLE public.condominium_member_transfers (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid NOT NULL,
      outgoing_member_id uuid NOT NULL,
      status text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      closed_at timestamptz,
      closed_by uuid,
      updated_at timestamptz
    );
    CREATE TABLE public.condominium_installments (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      fiscal_year_id uuid,
      member_id uuid,
      unit_id uuid,
      ledger_entry_id uuid,
      amount numeric NOT NULL,
      paid_amount numeric NOT NULL,
      status text
    );
    CREATE TABLE public.condominium_expense_allocations (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      ledger_entry_id uuid NOT NULL,
      unit_id uuid NOT NULL,
      member_id uuid,
      allocation_table_id uuid,
      amount numeric NOT NULL,
      paid_amount numeric NOT NULL,
      due_date date,
      status text
    );
    CREATE TABLE public.condominium_fiscal_carryovers (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid,
      member_id uuid,
      balance numeric NOT NULL
    );

    INSERT INTO public.condominiums(id, workspace_id)
      VALUES ('${ids.condominium}', '${ids.workspace}');
    INSERT INTO public.condominium_units(id, workspace_id, condominium_id) VALUES
      ('${ids.unitA}', '${ids.workspace}', '${ids.condominium}'),
      ('${ids.unitB}', '${ids.workspace}', '${ids.condominium}');
    INSERT INTO public.condominium_members(id, condominium_id, active, updated_at, data)
      VALUES ('${ids.memberA}', '${ids.condominium}', true, now(),
        '{"position_status":"Attivo","current_owner":true}'::jsonb);
    INSERT INTO public.condominium_ledger_entries(id, workspace_id, condominium_id, direction)
      VALUES ('20000000-0000-4000-8000-000000000001', '${ids.workspace}', '${ids.condominium}', 'Uscita');

    -- Install the exact baseline trigger functions used by the application.
    -- They validate workspace and condominium ownership but do not require the
    -- child row's unit_id to equal the selected member's unit_id.
    ${installmentScopeTrigger}
    ${allocationScopeTrigger}
    CREATE TRIGGER trg_validate_installment_scope
      BEFORE INSERT OR UPDATE ON public.condominium_installments
      FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_installment_scope();
    CREATE TRIGGER trg_validate_expense_allocation_scope
      BEFORE INSERT OR UPDATE ON public.condominium_expense_allocations
      FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_expense_allocation_scope();

    INSERT INTO public.condominium_member_transfers
      (id, workspace_id, condominium_id, unit_id, outgoing_member_id, status, data)
    VALUES
      ('${ids.transfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.memberA}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', jsonb_build_array('${ids.memberA}'))),
      ('${ids.shareTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.memberA}', 'Confermato',
       jsonb_build_object('transfer_scope', 'ownership_share', 'outgoing_member_ids', jsonb_build_array('${ids.memberA}')));

    -- Unit A: valid member-linked obligations that must remain in the closure check.
    INSERT INTO public.condominium_installments
      (id, workspace_id, condominium_id, unit_id, member_id, amount, paid_amount)
    VALUES
      ('10000000-0000-4000-8000-000000000001', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}', '${ids.memberA}', 100, 20);
    -- Unit B: the baseline scope triggers permit this same-condominium
    -- member/unit mismatch; it must not block transfer of Unit A.
    INSERT INTO public.condominium_installments
      (id, workspace_id, condominium_id, unit_id, member_id, amount, paid_amount)
    VALUES
      ('10000000-0000-4000-8000-000000000002', '${ids.workspace}', '${ids.condominium}', '${ids.unitB}', '${ids.memberA}', 200, 0);
    -- Legacy member-linked rows without unit_id remain included.
    INSERT INTO public.condominium_installments
      (id, workspace_id, condominium_id, unit_id, member_id, amount, paid_amount)
    VALUES
      ('10000000-0000-4000-8000-000000000003', '${ids.workspace}', '${ids.condominium}', NULL, '${ids.memberA}', 10, 0);

    INSERT INTO public.condominium_expense_allocations
      (id, workspace_id, condominium_id, ledger_entry_id, unit_id, member_id, amount, paid_amount)
    VALUES
      ('20000000-0000-4000-8000-000000000001', '${ids.workspace}', '${ids.condominium}', '20000000-0000-4000-8000-000000000001', '${ids.unitA}', '${ids.memberA}', 40, 10),
      ('20000000-0000-4000-8000-000000000002', '${ids.workspace}', '${ids.condominium}', '20000000-0000-4000-8000-000000000001', '${ids.unitB}', '${ids.memberA}', 50, 0);

    INSERT INTO public.condominium_fiscal_carryovers
      (id, workspace_id, condominium_id, unit_id, member_id, balance) VALUES
      ('30000000-0000-4000-8000-000000000001', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}', '${ids.memberA}', 10),
      ('30000000-0000-4000-8000-000000000002', '${ids.workspace}', '${ids.condominium}', '${ids.unitB}', '${ids.memberA}', 90),
      ('30000000-0000-4000-8000-000000000003', '${ids.workspace}', '${ids.condominium}', NULL, '${ids.memberA}', 2),
      ('30000000-0000-4000-8000-000000000004', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}', NULL, 5),
      ('30000000-0000-4000-8000-000000000005', '${ids.workspace}', '${ids.condominium}', '${ids.unitB}', NULL, 99);
  `);

  await db.exec(baselineFunction);
  await db.exec(baselineCloseFunction);
  await db.exec(checkPublicRpc);
  await db.exec(closePublicRpc);
  // Match the later hardening migration: the exposed RPC is SECURITY INVOKER,
  // while the private implementation remains SECURITY DEFINER.
  await db.exec("ALTER FUNCTION public.close_condominium_member_transfer(uuid) SECURITY INVOKER;");
  const security = await db.query(`
    SELECT
      (SELECT p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'close_condominium_member_transfer') AS public_is_definer,
      (SELECT p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname = 'close_condominium_member_transfer') AS private_is_definer
  `);
  assert.equal(security.rows[0].public_is_definer, false);
  assert.equal(security.rows[0].private_is_definer, true);
  const call = async (transferId) => {
    const result = await db.query(
      "SELECT public.check_condominium_member_transfer_closure($1::uuid) AS result",
      [transferId]
    );
    return result.rows[0].result;
  };

  const before = await call(ids.transfer);
  assert.equal(Number(before.open_installments), 290,
    "Baseline must reproduce counting Unit B's installment in a Unit A transfer.");
  assert.equal(Number(before.open_allocations), 80,
    "Baseline must reproduce counting Unit B's allocation in a Unit A transfer.");
  assert.equal(Number(before.open_member_carryovers), 102,
    "Baseline must reproduce counting Unit B's member carryover in a Unit A transfer.");
  assert.equal(Number(before.open_unit_carryovers), 5);
  assert.equal(Number(before.open_total), 477);
  console.log("PASS baseline reproduction: Unit B obligations inflate the Unit A transfer-closure totals.");

  let baselineCloseError;
  try {
    await db.query(
      "SELECT public.close_condominium_member_transfer($1::uuid)",
      [ids.transfer]
    );
  } catch (error) {
    baselineCloseError = error;
  }
  assert.ok(baselineCloseError, "Baseline close operation must reject the transfer because it counts Unit B obligations.");
  assert.match(String(baselineCloseError.message), /TRANSFER_FINANCIAL_POSITIONS_OPEN/);
  console.log("PASS baseline close reproduction: the authoritative close helper also blocks Unit A because of Unit B obligations.");

  await db.exec(migrationSql);
  const after = await call(ids.transfer);
  assert.equal(Number(after.open_installments), 90,
    "Corrected result must retain Unit A and legacy unit-null installments only.");
  assert.equal(Number(after.open_allocations), 30,
    "Corrected result must retain Unit A and legacy unit-null allocations only.");
  assert.equal(Number(after.open_member_carryovers), 12,
    "Corrected result must retain Unit A and legacy unit-null member carryovers only.");
  assert.equal(Number(after.open_unit_carryovers), 5);
  assert.equal(Number(after.open_total), 137);
  console.log("PASS corrected closure check: only selected-unit and legacy unit-null member obligations remain.");

  const ownershipShare = await call(ids.shareTransfer);
  assert.equal(Number(ownershipShare.open_total), 0,
    "Ownership-share transfers must retain their existing zero-closure behavior.");
  assert.equal(Number(ownershipShare.open_installments), 0);
  assert.equal(Number(ownershipShare.open_allocations), 0);
  assert.equal(Number(ownershipShare.open_member_carryovers), 0);
  assert.equal(Number(ownershipShare.open_unit_carryovers), 0);
  console.log("PASS ownership-share compatibility: no closure balances are introduced.");

  // Clear only Unit A and legacy unit-null member obligations. Unit B remains
  // unpaid; the corrected close operation must ignore those other-unit rows.
  await db.exec(`
    UPDATE public.condominium_installments
      SET paid_amount = amount
      WHERE member_id = '${ids.memberA}'
        AND (unit_id IS NULL OR unit_id = '${ids.unitA}');
    UPDATE public.condominium_expense_allocations
      SET paid_amount = amount
      WHERE member_id = '${ids.memberA}' AND unit_id = '${ids.unitA}';
    UPDATE public.condominium_fiscal_carryovers
      SET balance = 0
      WHERE member_id = '${ids.memberA}'
        AND (unit_id IS NULL OR unit_id = '${ids.unitA}');
    UPDATE public.condominium_fiscal_carryovers
      SET balance = 0
      WHERE member_id IS NULL AND unit_id = '${ids.unitA}';
  `);

  const ready = await call(ids.transfer);
  assert.equal(Number(ready.open_total), 0,
    "After clearing Unit A obligations, Unit B obligations must not prevent closure.");
  const closed = await db.query(
    "SELECT public.close_condominium_member_transfer($1::uuid) AS closed",
    [ids.transfer]
  );
  assert.equal(closed.rows[0].closed, true);
  const transferState = await db.query(
    "SELECT status FROM public.condominium_member_transfers WHERE id = $1::uuid",
    [ids.transfer]
  );
  const memberState = await db.query(
    "SELECT active FROM public.condominium_members WHERE id = $1::uuid",
    [ids.memberA]
  );
  assert.equal(transferState.rows[0].status, "Chiuso");
  assert.equal(memberState.rows[0].active, false);
  console.log("PASS corrected close operation: Unit A closes while Unit B balances remain open.");
} finally {
  await db.close();
}
