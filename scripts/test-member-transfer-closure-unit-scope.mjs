import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baselinePath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261125064000_scope_member_transfer_closure_financial_positions_to_unit.sql";
const scopeMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261125073000_validate_member_transfer_outgoing_member_scope.sql";
const unitAllocationMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261125090000_include_unit_unassigned_allocations_in_transfer_closure.sql";
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const auditEvidence = await readFile(
  "docs/audit/2026-11-25-member-transfer-outgoing-member-scope.md",
  "utf8"
);
assert.match(
  auditEvidence,
  /069b98db19be3e865425bff162058693cbe5eee2/,
  "Audit documentation must record the exact code/test commit that passed CI."
);
assert.match(
  auditEvidence,
  /45582718332/,
  "Audit documentation must record the exact GitHub Actions run."
);
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
const scopeMigrationSql = await readFile(scopeMigrationPath, "utf8");
const unitAllocationMigrationSql = await readFile(unitAllocationMigrationPath, "utf8");
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
  foreignWorkspace: "22222222-2222-4222-8222-222222222222",
  foreignCondominium: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  unitA: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  unitB: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  memberA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  otherMember: "f1111111-1111-4111-8111-111111111111",
  scopeTestMember: "f2222222-2222-4222-8222-222222222222",
  otherUnitMember: "f3333333-3333-4333-8333-333333333333",
  foreignMember: "f4444444-4444-4444-8444-444444444444",
  missingMember: "f5555555-5555-4555-8555-555555555555",
  unitAUnassignedAllocation: "20000000-0000-4000-8000-000000000003",
  unitBUnassignedAllocation: "20000000-0000-4000-8000-000000000004",
  transfer: "f0000000-0000-4000-8000-000000000001",
  shareTransfer: "f0000000-0000-4000-8000-000000000002",
  emptyArrayTransfer: "f0000000-0000-4000-8000-000000000003",
  missingPrimaryTransfer: "f0000000-0000-4000-8000-000000000004",
  otherUnitScopeTransfer: "f0000000-0000-4000-8000-000000000005",
  foreignScopeTransfer: "f0000000-0000-4000-8000-000000000006",
  missingMemberScopeTransfer: "f0000000-0000-4000-8000-000000000007",
  nullMemberScopeTransfer: "f0000000-0000-4000-8000-000000000008"
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
      unit_id uuid,
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
      VALUES
        ('${ids.condominium}', '${ids.workspace}'),
        ('${ids.foreignCondominium}', '${ids.foreignWorkspace}');
    INSERT INTO public.condominium_units(id, workspace_id, condominium_id) VALUES
      ('${ids.unitA}', '${ids.workspace}', '${ids.condominium}'),
      ('${ids.unitB}', '${ids.workspace}', '${ids.condominium}');
    INSERT INTO public.condominium_members(id, condominium_id, unit_id, active, updated_at, data)
      VALUES
        ('${ids.memberA}', '${ids.condominium}', '${ids.unitA}', true, now(),
          '{"position_status":"Attivo","current_owner":true}'::jsonb),
        ('${ids.otherMember}', '${ids.condominium}', '${ids.unitA}', true, now(),
          '{"position_status":"Attivo","current_owner":true}'::jsonb),
        ('${ids.scopeTestMember}', '${ids.condominium}', '${ids.unitA}', true, now(),
          '{"position_status":"Attivo","current_owner":true}'::jsonb),
        ('${ids.otherUnitMember}', '${ids.condominium}', '${ids.unitB}', true, now(),
          '{"position_status":"Attivo","current_owner":true}'::jsonb),
        ('${ids.foreignMember}', '${ids.foreignCondominium}', NULL, true, now(),
          '{"position_status":"Attivo","current_owner":true}'::jsonb);
    INSERT INTO public.condominium_ledger_entries(id, workspace_id, condominium_id, direction)
      VALUES
        ('20000000-0000-4000-8000-000000000001', '${ids.workspace}', '${ids.condominium}', 'Uscita'),
        ('20000000-0000-4000-8000-000000000002', '${ids.workspace}', '${ids.condominium}', 'Uscita');

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
       jsonb_build_object('transfer_scope', 'ownership_share', 'outgoing_member_ids', jsonb_build_array('${ids.memberA}'))),
      ('${ids.emptyArrayTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.memberA}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', '[]'::jsonb)),
      ('${ids.missingPrimaryTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.memberA}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', jsonb_build_array('${ids.otherMember}'))),
      ('${ids.otherUnitScopeTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.scopeTestMember}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', jsonb_build_array('${ids.scopeTestMember}', '${ids.otherUnitMember}'))),
      ('${ids.foreignScopeTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.scopeTestMember}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', jsonb_build_array('${ids.scopeTestMember}', '${ids.foreignMember}'))),
      ('${ids.missingMemberScopeTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.scopeTestMember}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', jsonb_build_array('${ids.scopeTestMember}', '${ids.missingMember}'))),
      ('${ids.nullMemberScopeTransfer}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}',
       '${ids.scopeTestMember}', 'Confermato',
       jsonb_build_object('transfer_scope', 'whole_property', 'outgoing_member_ids', jsonb_build_array('${ids.scopeTestMember}', null)));

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
      ('10000000-0000-4000-8000-000000000003', '${ids.workspace}', '${ids.condominium}', NULL, '${ids.memberA}', 10, 0),
      -- A unit-assigned installment without a member must still block transfer closure.
      ('10000000-0000-4000-8000-000000000004', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}', NULL, 50, 10);

    INSERT INTO public.condominium_expense_allocations
      (id, workspace_id, condominium_id, ledger_entry_id, unit_id, member_id, amount, paid_amount)
    VALUES
      ('20000000-0000-4000-8000-000000000001', '${ids.workspace}', '${ids.condominium}', '20000000-0000-4000-8000-000000000001', '${ids.unitA}', '${ids.memberA}', 40, 10),
      ('20000000-0000-4000-8000-000000000002', '${ids.workspace}', '${ids.condominium}', '20000000-0000-4000-8000-000000000001', '${ids.unitB}', '${ids.memberA}', 50, 0),
      ('${ids.unitAUnassignedAllocation}', '${ids.workspace}', '${ids.condominium}', '20000000-0000-4000-8000-000000000002', '${ids.unitA}', NULL, 40, 10),
      ('${ids.unitBUnassignedAllocation}', '${ids.workspace}', '${ids.condominium}', '20000000-0000-4000-8000-000000000001', '${ids.unitB}', NULL, 60, 0);

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

  const missingPrimaryBefore = await call(ids.missingPrimaryTransfer);
  assert.equal(Number(missingPrimaryBefore.open_installments), 0,
    "Baseline must expose the missing-primary bug: a non-empty array that omits outgoing_member_id hides the primary member's installments.");
  assert.equal(Number(missingPrimaryBefore.open_allocations), 0);
  assert.equal(Number(missingPrimaryBefore.open_member_carryovers), 0);
  assert.equal(Number(missingPrimaryBefore.open_total), 5);
  console.log("PASS baseline reproduction: non-empty outgoing_member_ids omitting the primary member hides that member's balances.");

  const emptyArrayBefore = await call(ids.emptyArrayTransfer);
  assert.equal(Number(emptyArrayBefore.open_installments), 0,
    "Baseline must expose the empty-array bug: member-linked installments disappear when array_agg returns NULL.");
  assert.equal(Number(emptyArrayBefore.open_allocations), 0);
  assert.equal(Number(emptyArrayBefore.open_member_carryovers), 0);
  assert.equal(Number(emptyArrayBefore.open_unit_carryovers), 5);
  assert.equal(Number(emptyArrayBefore.open_total), 5,
    "Baseline incorrectly reports only the unit-level carryover when outgoing_member_ids is empty.");
  console.log("PASS baseline reproduction: empty outgoing_member_ids hides member-linked financial positions.");

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
  const missingPrimaryAfter = await call(ids.missingPrimaryTransfer);
  assert.equal(Number(missingPrimaryAfter.open_installments), 130,
    "Corrected function must prepend the primary outgoing_member_id when a non-empty JSON array omits it.");
  assert.equal(Number(missingPrimaryAfter.open_allocations), 30);
  assert.equal(Number(missingPrimaryAfter.open_member_carryovers), 12);
  assert.equal(Number(missingPrimaryAfter.open_unit_carryovers), 5);
  assert.equal(Number(missingPrimaryAfter.open_total), 177);
  let missingPrimaryCloseError;
  try {
    await db.query("SELECT public.close_condominium_member_transfer($1::uuid)", [ids.missingPrimaryTransfer]);
  } catch (error) {
    missingPrimaryCloseError = error;
  }
  assert.ok(missingPrimaryCloseError, "A non-empty outgoing_member_ids array omitting the primary member must not bypass closure.");
  assert.match(String(missingPrimaryCloseError.message), /TRANSFER_FINANCIAL_POSITIONS_OPEN/);
  console.log("PASS corrected primary-member inclusion: the omitted primary member's balances are counted and closure is blocked.");

  const emptyArrayAfter = await call(ids.emptyArrayTransfer);
  assert.equal(Number(emptyArrayAfter.open_installments), 130,
    "Corrected function must fall back to the primary outgoing_member_id when the JSON array is empty.");
  assert.equal(Number(emptyArrayAfter.open_allocations), 30);
  assert.equal(Number(emptyArrayAfter.open_member_carryovers), 12);
  assert.equal(Number(emptyArrayAfter.open_unit_carryovers), 5);
  assert.equal(Number(emptyArrayAfter.open_total), 177);
  let emptyArrayCloseError;
  try {
    await db.query("SELECT public.close_condominium_member_transfer($1::uuid)", [ids.emptyArrayTransfer]);
  } catch (error) {
    emptyArrayCloseError = error;
  }
  assert.ok(emptyArrayCloseError, "An empty outgoing_member_ids array must not bypass the financial closure guard.");
  assert.match(String(emptyArrayCloseError.message), /TRANSFER_FINANCIAL_POSITIONS_OPEN/);
  console.log("PASS corrected empty-array fallback: member balances are counted and closure is blocked.");

  const after = await call(ids.transfer);
  assert.equal(Number(after.open_installments), 130,
    "Corrected result must retain Unit A, legacy unit-null and unit-assigned unallocated installments.");
  assert.equal(Number(after.open_allocations), 30,
    "Corrected result must retain Unit A and legacy unit-null allocations only.");
  assert.equal(Number(after.open_member_carryovers), 12,
    "Corrected result must retain Unit A and legacy unit-null member carryovers only.");
  assert.equal(Number(after.open_unit_carryovers), 5);
  assert.equal(Number(after.open_total), 177);
  console.log("PASS corrected closure check: selected-unit, legacy unit-null and unit-unassigned installments are included; other-unit obligations are excluded.");

  // Clear selected-unit obligations so the isolated outgoing-ID cases can reach
  // the archival loop; Unit B obligations remain untouched and out of scope.
  await db.exec(`
    UPDATE public.condominium_installments
      SET paid_amount = amount
      WHERE (member_id = '${ids.memberA}' AND (unit_id IS NULL OR unit_id = '${ids.unitA}'))
         OR (member_id IS NULL AND unit_id = '${ids.unitA}');
    UPDATE public.condominium_expense_allocations
      SET paid_amount = amount
      WHERE member_id = '${ids.memberA}' AND unit_id = '${ids.unitA}';
    UPDATE public.condominium_fiscal_carryovers
      SET balance = 0
      WHERE (member_id = '${ids.memberA}' AND (unit_id IS NULL OR unit_id = '${ids.unitA}'))
         OR (member_id IS NULL AND unit_id = '${ids.unitA}');
  `);

  const unitAUnassignedBefore = await db.query(
    "SELECT sum(amount-paid_amount) AS residual FROM public.condominium_expense_allocations WHERE id=$1::uuid",
    [ids.unitAUnassignedAllocation]
  );
  assert.equal(Number(unitAUnassignedBefore.rows[0].residual), 30,
    "A unit-unassigned allocation must remain outstanding during the baseline close reproduction.");

  // The #452 close helper still trusted JSON member IDs when archiving records.
  // It also ignored unit-unassigned allocations, allowing closure while a
  // selected-unit allocation remained unpaid.
  const baselineScopeCases = [
    { id: ids.otherUnitScopeTransfer, unexpectedMember: ids.otherUnitMember, label: "another unit in the same condominium" },
    { id: ids.foreignScopeTransfer, unexpectedMember: ids.foreignMember, label: "another condominium/workspace" },
    { id: ids.missingMemberScopeTransfer, unexpectedMember: null, label: "a non-existent member ID" },
    { id: ids.nullMemberScopeTransfer, unexpectedMember: null, label: "a NULL member ID" }
  ];
  for (const item of baselineScopeCases) {
    const baselineScopeCheck = await call(item.id);
    assert.equal(Number(baselineScopeCheck.open_total), 0,
      "Baseline must not find financial balances for the isolated scope-test members: " + item.label);
    assert.equal(Number(baselineScopeCheck.open_allocations), 0,
      "Baseline must ignore the outstanding unit-unassigned allocation: " + item.label);
    const baselineScopeClose = await db.query(
      "SELECT public.close_condominium_member_transfer($1::uuid) AS closed",
      [item.id]
    );
    assert.equal(baselineScopeClose.rows[0].closed, true,
      "Baseline close helper must reproduce accepting " + item.label + ".");
    const primaryState = await db.query(
      "SELECT active FROM public.condominium_members WHERE id = $1::uuid",
      [ids.scopeTestMember]
    );
    assert.equal(primaryState.rows[0].active, false,
      "Baseline must archive the primary member for " + item.label + ".");
    if (item.unexpectedMember) {
      const unexpectedState = await db.query(
        "SELECT active FROM public.condominium_members WHERE id = $1::uuid",
        [item.unexpectedMember]
      );
      assert.equal(unexpectedState.rows[0].active, false,
        "Baseline must reproduce archiving a member outside the selected unit/condominium: " + item.label);
    }
    await db.query(
      "UPDATE public.condominium_members SET active = true WHERE id = $1::uuid",
      [ids.scopeTestMember]
    );
    if (item.unexpectedMember) {
      await db.query(
        "UPDATE public.condominium_members SET active = true WHERE id = $1::uuid",
        [item.unexpectedMember]
      );
    }
  }
  await db.exec(`
    UPDATE public.condominium_member_transfers
    SET status = 'Confermato', closed_at = NULL, closed_by = NULL
    WHERE id IN (
      '${ids.otherUnitScopeTransfer}',
      '${ids.foreignScopeTransfer}',
      '${ids.missingMemberScopeTransfer}',
      '${ids.nullMemberScopeTransfer}'
    );
  `);
  console.log("PASS baseline reproduction: transfer closure archived other-unit/cross-condominium members and accepted missing/NULL outgoing IDs.");

  const ownershipShare = await call(ids.shareTransfer);
  assert.equal(Number(ownershipShare.open_total), 0,
    "Ownership-share transfers must retain their existing zero-closure behavior.");
  assert.equal(Number(ownershipShare.open_installments), 0);
  assert.equal(Number(ownershipShare.open_allocations), 0);
  assert.equal(Number(ownershipShare.open_member_carryovers), 0);
  assert.equal(Number(ownershipShare.open_unit_carryovers), 0);
  console.log("PASS ownership-share compatibility: no closure balances are introduced.");

  await db.exec(scopeMigrationSql);
  await db.exec(unitAllocationMigrationSql);
  const correctedScopeCases = [
    { id: ids.otherUnitScopeTransfer, label: "member assigned to another unit" },
    { id: ids.foreignScopeTransfer, label: "member belonging to another condominium/workspace" },
    { id: ids.missingMemberScopeTransfer, label: "non-existent member ID" },
    { id: ids.nullMemberScopeTransfer, label: "NULL member ID" }
  ];
  for (const item of correctedScopeCases) {
    let checkError;
    try {
      await call(item.id);
    } catch (error) {
      checkError = error;
    }
    assert.ok(checkError, "Closure check must reject " + item.label + ".");
    assert.match(String(checkError.message), /TRANSFER_OUTGOING_MEMBER_SCOPE_MISMATCH/);

    let closeError;
    try {
      await db.query(
        "SELECT public.close_condominium_member_transfer($1::uuid)",
        [item.id]
      );
    } catch (error) {
      closeError = error;
    }
    assert.ok(closeError, "Authoritative close must reject " + item.label + ".");
    assert.match(String(closeError.message), /TRANSFER_OUTGOING_MEMBER_SCOPE_MISMATCH/);

    const transferState = await db.query(
      "SELECT status, closed_at, closed_by FROM public.condominium_member_transfers WHERE id = $1::uuid",
      [item.id]
    );
    assert.equal(transferState.rows[0].status, "Confermato",
      "Rejected scope mismatch must leave transfer status unchanged: " + item.label);
    assert.equal(transferState.rows[0].closed_at, null,
      "Rejected scope mismatch must not set closed_at: " + item.label);
    const primaryState = await db.query(
      "SELECT active FROM public.condominium_members WHERE id = $1::uuid",
      [ids.scopeTestMember]
    );
    assert.equal(primaryState.rows[0].active, true,
      "Rejected scope mismatch must not archive the primary member: " + item.label);
  }
  const outOfScopeState = await db.query(
    "SELECT id, active FROM public.condominium_members WHERE id = ANY($1::uuid[])",
    [[ids.otherUnitMember, ids.foreignMember]]
  );
  assert.ok(outOfScopeState.rows.every(row => row.active === true),
    "Rejected transfers must not archive any out-of-scope member.");
  console.log("PASS corrected outgoing-member scope: check and close reject other-unit, cross-condominium, missing and NULL IDs without changing members or transfer state.");

  const unitAllocationCheck = await call(ids.transfer);
  assert.equal(Number(unitAllocationCheck.open_allocations), 30,
    "Closure must include only Unit A's unpaid unit-unassigned allocation and exclude Unit B's.");
  assert.equal(Number(unitAllocationCheck.open_total), 30);
  let unitAllocationCloseError;
  try {
    await db.query(
      "SELECT public.close_condominium_member_transfer($1::uuid)",
      [ids.transfer]
    );
  } catch (error) {
    unitAllocationCloseError = error;
  }
  assert.ok(unitAllocationCloseError, "An unpaid unit-unassigned allocation must block closure.");
  assert.match(String(unitAllocationCloseError.message), /TRANSFER_FINANCIAL_POSITIONS_OPEN/);
  const stillOpenTransfer = await db.query(
    "SELECT status, closed_at FROM public.condominium_member_transfers WHERE id=$1::uuid",
    [ids.transfer]
  );
  assert.equal(stillOpenTransfer.rows[0].status, "Confermato");
  assert.equal(stillOpenTransfer.rows[0].closed_at, null);
  console.log("PASS corrected unit-unassigned allocations: selected-unit residual blocks closure; another unit's allocation is excluded.");

  // Clear only Unit A and legacy unit-null member obligations. Unit B remains
  // unpaid; the corrected close operation must ignore those other-unit rows.
  await db.exec(`
    UPDATE public.condominium_installments
      SET paid_amount = amount
      WHERE (member_id = '${ids.memberA}' AND (unit_id IS NULL OR unit_id = '${ids.unitA}'))
         OR (member_id IS NULL AND unit_id = '${ids.unitA}');
    UPDATE public.condominium_expense_allocations
      SET paid_amount = amount
      WHERE (member_id = '${ids.memberA}' AND unit_id = '${ids.unitA}')
         OR (member_id IS NULL AND unit_id = '${ids.unitA}');
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
