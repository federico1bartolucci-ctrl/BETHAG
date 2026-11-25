import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baselineSql = await readFile("supabase/migrations/20261017000003_bethag_baseline_functions.sql", "utf8");
function extractFunction(name) {
  const marker = "CREATE OR REPLACE FUNCTION public." + name + "(";
  const start = baselineSql.indexOf(marker);
  const end = baselineSql.indexOf("\n;\n", start) + 3;
  assert.ok(start >= 0 && end > start, "The exact baseline function must be present: " + name);
  return baselineSql.slice(start, end);
}
const baselinePreview = extractFunction("preview_condominium_member_transfer");
const installmentScopeTrigger = extractFunction("validate_condominium_installment_scope");
const allocationScopeTrigger = extractFunction("validate_condominium_expense_allocation_scope");

const migrationPath = "supabase/rebuild/drafts/20261125040000_scope_member_transfer_preview_by_workspace_and_condominium.sql";
const unitAllocationPreviewMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261125090002_include_unit_unassigned_allocations_in_transfer_preview.sql";
const migrationSql = await readFile(migrationPath, "utf8");
const unitAllocationPreviewMigrationSql = await readFile(unitAllocationPreviewMigrationPath, "utf8");
const transferPanelSource = await readFile("src/MemberTransferPanel.tsx", "utf8");
assert.match(transferPanelSource, /unit_unassigned_allocations/,
  "Transfer UI must aggregate and render unit-unassigned expense allocations.");
assert.match(transferPanelSource, /Spese dell’unità non attribuite/,
  "Transfer UI must label unit-unassigned expense allocations in preview and snapshot.");
assert.ok(migrationSql.includes("CREATE OR REPLACE FUNCTION public.preview_condominium_member_transfer("));

const ids = {
  workspace: "11111111-1111-4111-8111-111111111111",
  condominium: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  unitA: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  unitB: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  memberA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  ownInstallment: "10000000-0000-4000-8000-000000000001",
  mislinkedInstallment: "10000000-0000-4000-8000-000000000002",
  unitBUnassignedInstallment: "10000000-0000-4000-8000-000000000003",
  ledgerB: "20000000-0000-4000-8000-000000000001",
  ledgerA: "20000000-0000-4000-8000-000000000002",
  unitAUnassignedAllocation: "30000000-0000-4000-8000-000000000002",
  unitBUnassignedAllocation: "30000000-0000-4000-8000-000000000003",
  mislinkedAllocation: "30000000-0000-4000-8000-000000000001",
  ownCarryover: "40000000-0000-4000-8000-000000000001",
  unitBCarryover: "40000000-0000-4000-8000-000000000002"
};

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS private;
    CREATE ROLE authenticated NOLOGIN;

    CREATE OR REPLACE FUNCTION private.can_access_workspace_module(p_workspace_id uuid, p_module text)
    RETURNS boolean LANGUAGE sql STABLE
    AS $$ SELECT p_workspace_id = '${ids.workspace}'::uuid $$;

    CREATE TABLE public.condominiums (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      archived_at timestamptz
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
      data jsonb NOT NULL
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
    CREATE TABLE public.condominium_installments (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      fiscal_year_id uuid,
      member_id uuid,
      unit_id uuid,
      ledger_entry_id uuid,
      title text NOT NULL,
      due_date date,
      amount numeric NOT NULL,
      paid_amount numeric NOT NULL,
      status text NOT NULL
    );
    CREATE TABLE public.condominium_ledger_entries (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid,
      direction text NOT NULL,
      expense_type text NOT NULL,
      entry_date date NOT NULL,
      deliberation_date date,
      description text NOT NULL,
      amount numeric NOT NULL,
      assembly_id uuid
    );
    CREATE TABLE public.condominium_expense_allocations (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      ledger_entry_id uuid NOT NULL,
      unit_id uuid,
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
      balance numeric NOT NULL,
      kind text NOT NULL,
      status text NOT NULL,
      source_fiscal_year_id uuid,
      target_fiscal_year_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await db.exec(installmentScopeTrigger);
  await db.exec(allocationScopeTrigger);
  await db.exec(baselinePreview);
  await db.exec(`
    CREATE TRIGGER trg_validate_installment_scope
      BEFORE INSERT OR UPDATE ON public.condominium_installments
      FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_installment_scope();
    CREATE TRIGGER trg_validate_expense_allocation_scope
      BEFORE INSERT OR UPDATE ON public.condominium_expense_allocations
      FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_expense_allocation_scope();

    INSERT INTO public.condominiums(id, workspace_id, archived_at)
    VALUES ('${ids.condominium}', '${ids.workspace}', NULL);

    INSERT INTO public.condominium_units(id, workspace_id, condominium_id) VALUES
      ('${ids.unitA}', '${ids.workspace}', '${ids.condominium}'),
      ('${ids.unitB}', '${ids.workspace}', '${ids.condominium}');

    INSERT INTO public.condominium_members(id, condominium_id, unit_id, active, data)
    VALUES ('${ids.memberA}', '${ids.condominium}', '${ids.unitA}', true,
      '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb);

    INSERT INTO public.condominium_ledger_entries
      (id, workspace_id, condominium_id, unit_id, direction, expense_type, entry_date, deliberation_date, description, amount)
    VALUES
      ('${ids.ledgerB}', '${ids.workspace}', '${ids.condominium}', '${ids.unitB}', 'Uscita', 'Straordinaria', '2026-11-01', '2026-11-01', 'Delibera unità B', 50),
      ('${ids.ledgerA}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}', 'Uscita', 'Straordinaria', '2026-11-02', '2026-11-02', 'Delibera unità A', 40);

    -- The real baseline scope triggers allow these rows because both the member
    -- and unit independently belong to the same workspace/condominium. They do
    -- not assert that memberA.unit_id equals the child row's unit_id.
    INSERT INTO public.condominium_installments
      (id, workspace_id, condominium_id, member_id, unit_id, title, due_date, amount, paid_amount, status)
    VALUES
      ('${ids.ownInstallment}', '${ids.workspace}', '${ids.condominium}', '${ids.memberA}', '${ids.unitA}', 'Rata unità A', '2026-11-20', 100, 20, 'Parzialmente pagato'),
      ('${ids.mislinkedInstallment}', '${ids.workspace}', '${ids.condominium}', '${ids.memberA}', '${ids.unitB}', 'Rata membro A con unità B', '2026-11-20', 200, 0, 'Da pagare'),
      ('${ids.unitBUnassignedInstallment}', '${ids.workspace}', '${ids.condominium}', NULL, '${ids.unitB}', 'Rata non assegnata unità B', '2026-11-20', 300, 0, 'Da pagare');

    INSERT INTO public.condominium_expense_allocations
      (id, workspace_id, condominium_id, ledger_entry_id, unit_id, member_id, amount, paid_amount, due_date, status)
    VALUES
      ('${ids.mislinkedAllocation}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerB}', '${ids.unitB}', '${ids.memberA}', 50, 0, '2026-12-01', 'Da pagare'),
      ('${ids.unitAUnassignedAllocation}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerA}', '${ids.unitA}', NULL, 40, 10, '2026-12-01', 'Parzialmente pagato'),
      ('${ids.unitBUnassignedAllocation}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerB}', '${ids.unitB}', NULL, 100, 0, '2026-12-01', 'Da pagare');

    INSERT INTO public.condominium_fiscal_carryovers
      (id, workspace_id, condominium_id, unit_id, member_id, balance, kind, status)
    VALUES
      ('${ids.ownCarryover}', '${ids.workspace}', '${ids.condominium}', '${ids.unitA}', NULL, 10, 'Debito', 'Da riportare'),
      ('${ids.unitBCarryover}', '${ids.workspace}', '${ids.condominium}', '${ids.unitB}', NULL, 90, 'Debito', 'Da riportare');
  `);

  for (const table of ["condominium_installments", "condominium_expense_allocations", "condominium_ledger_entries", "condominium_fiscal_carryovers"]) {
    await db.exec(`
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY ${table}_workspace_read ON public.${table}
        FOR SELECT TO authenticated
        USING (private.can_access_workspace_module(workspace_id, 'contabilita'));
    `);
  }
  await db.exec(`
    GRANT USAGE ON SCHEMA public, private TO authenticated;
    GRANT EXECUTE ON FUNCTION private.can_access_workspace_module(uuid, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.preview_condominium_member_transfer(uuid, uuid, date) TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
    SET ROLE authenticated;
  `);

  const beforeResult = await db.query(
    "SELECT public.preview_condominium_member_transfer($1::uuid, $2::uuid, $3::date) AS preview",
    [ids.unitA, ids.memberA, "2026-11-25"]
  );
  const before = beforeResult.rows[0].preview;
  assert.equal(before.installments_before.length, 2,
    "Legacy function must reproduce a member-linked installment from another unit in the same condominium.");
  assert.equal(Number(before.outstanding_before), 280,
    "Legacy function must reproduce the inflated unit-level outstanding amount.");
  assert.equal(Number(before.paid_before), 20);
  assert.equal(Number(before.outstanding_total), 280);
  assert.equal(before.extraordinary_deliberated_before_due_after.length, 1,
    "Legacy function must reproduce a member-linked extraordinary allocation from another unit.");
  assert.equal(before.unit_unassigned_carryovers.length, 1,
    "Only the selected unit's unassigned carryover should be present.");

  await db.exec("RESET ROLE");
  await db.exec(migrationSql);
  await db.exec("SET ROLE authenticated");

  const afterResult = await db.query(
    "SELECT public.preview_condominium_member_transfer($1::uuid, $2::uuid, $3::date) AS preview",
    [ids.unitA, ids.memberA, "2026-11-25"]
  );
  const after = afterResult.rows[0].preview;
  assert.deepEqual(after.installments_before.map(row => row.id), [ids.ownInstallment],
    "Corrected function must include only installments assigned to the selected unit.");
  assert.equal(Number(after.outstanding_before), 80,
    "Corrected outstanding amount must exclude another unit's installment.");
  assert.equal(Number(after.paid_before), 20);
  assert.equal(Number(after.outstanding_total), 80);
  assert.equal(after.extraordinary_deliberated_before_due_after.length, 0,
    "Corrected function must exclude another unit's extraordinary allocation.");
  assert.deepEqual(after.unit_unassigned_carryovers.map(row => row.id), [ids.ownCarryover],
    "Selected unit carryover must remain visible.");
  assert.equal(after.review_flags.unpaid_before_transfer, true,
    "The selected unit's own unpaid installment warning must remain intact.");
  assert.equal(after.review_flags.extraordinary_deliberated_before_due_after, false,
    "The other unit's extraordinary allocation must not trigger the selected unit's review flag.");
  assert.equal(after.unit_unassigned_allocations, undefined,
    "The scoped preview still omits unit-unassigned expense allocations before the new correction.");

  await db.exec("RESET ROLE");
  await db.exec(unitAllocationPreviewMigrationSql);
  await db.exec("SET ROLE authenticated");
  const withAllocResult = await db.query(
    "SELECT public.preview_condominium_member_transfer($1::uuid, $2::uuid, $3::date) AS preview",
    [ids.unitA, ids.memberA, "2026-11-25"]
  );
  const withAlloc = withAllocResult.rows[0].preview;
  assert.deepEqual(withAlloc.unit_unassigned_allocations.map(row => row.id), [ids.unitAUnassignedAllocation],
    "Preview must expose only the selected unit's unit-unassigned expense allocations.");
  assert.equal(Number(withAlloc.unit_unassigned_allocations_outstanding), 30);
  assert.equal(withAlloc.review_flags.unit_unassigned_allocations, true,
    "Outstanding unit-unassigned allocations must raise a review flag.");

  console.log(JSON.stringify({
    suite: "BETHAG_MEMBER_TRANSFER_PREVIEW_UNIT_SCOPE",
    status: "PASS",
    legacy_defect_reproduced: {
      selected_unit_installments: before.installments_before.length,
      inflated_outstanding_before: Number(before.outstanding_before),
      other_unit_extraordinary_allocations: before.extraordinary_deliberated_before_due_after.length,
      selected_unit_carryovers: before.unit_unassigned_carryovers.length,
      baseline_scope_triggers: "PASSED_MISLINKED_MEMBER_UNIT_ROWS"
    },
    corrected_preview: {
      selected_unit_installments: after.installments_before.length,
      outstanding_before: Number(after.outstanding_before),
      other_unit_extraordinary_allocations: after.extraordinary_deliberated_before_due_after.length,
      selected_unit_carryovers: after.unit_unassigned_carryovers.length,
      unit_unassigned_allocations: withAlloc.unit_unassigned_allocations.length,
      unit_unassigned_allocations_outstanding: Number(withAlloc.unit_unassigned_allocations_outstanding)
    }
  }, null, 2));
} finally {
  await db.close();
}
