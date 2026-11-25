import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baselineSql = await readFile("supabase/migrations/20261017000003_bethag_baseline_functions.sql", "utf8");
const marker = "CREATE OR REPLACE FUNCTION public.preview_condominium_member_transfer(";
const baselineStart = baselineSql.indexOf(marker);
const baselineEnd = baselineSql.indexOf("\n;\n", baselineStart) + 3;
assert.ok(baselineStart >= 0 && baselineEnd > baselineStart, "The exact baseline preview function must be present.");
const baselineFunction = baselineSql.slice(baselineStart, baselineEnd);

const migrationPath = "supabase/rebuild/drafts/20261125040000_scope_member_transfer_preview_by_workspace_and_condominium.sql";
const migrationSql = await readFile(migrationPath, "utf8");
assert.ok(migrationSql.includes(marker), "Draft migration must replace the real preview function.");

const ids = {
  workspaceA: "11111111-1111-4111-8111-111111111111",
  workspaceB: "22222222-2222-4222-8222-222222222222",
  condominiumA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  condominiumB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  unitA: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  unitB: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  memberA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  ownInstallment: "10000000-0000-4000-8000-000000000001",
  foreignMemberInstallment: "10000000-0000-4000-8000-000000000002",
  foreignUnitInstallment: "10000000-0000-4000-8000-000000000003",
  foreignWorkspaceInstallment: "10000000-0000-4000-8000-000000000004",
  foreignLedger: "20000000-0000-4000-8000-000000000001",
  foreignAllocation: "30000000-0000-4000-8000-000000000001",
  ownCarryover: "40000000-0000-4000-8000-000000000001",
  foreignCondominiumCarryover: "40000000-0000-4000-8000-000000000002",
  foreignWorkspaceCarryover: "40000000-0000-4000-8000-000000000003"
};

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS private;
    CREATE ROLE authenticated NOLOGIN;

    CREATE OR REPLACE FUNCTION private.can_access_workspace_module(p_workspace_id uuid, p_module text)
    RETURNS boolean LANGUAGE sql STABLE
    AS $$ SELECT p_workspace_id = '${ids.workspaceA}'::uuid $$;

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
    CREATE TABLE public.condominium_installments (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      fiscal_year_id uuid,
      member_id uuid,
      unit_id uuid,
      title text NOT NULL,
      due_date date,
      amount numeric NOT NULL,
      paid_amount numeric NOT NULL,
      status text NOT NULL
    );
    CREATE TABLE public.condominium_expense_allocations (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      ledger_entry_id uuid NOT NULL,
      member_id uuid,
      amount numeric NOT NULL,
      paid_amount numeric NOT NULL,
      due_date date,
      status text
    );
    CREATE TABLE public.condominium_ledger_entries (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid,
      expense_type text NOT NULL,
      entry_date date NOT NULL,
      deliberation_date date,
      description text NOT NULL,
      amount numeric NOT NULL,
      assembly_id uuid
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

  await db.exec(baselineFunction);

  await db.exec(`
    INSERT INTO public.condominiums(id, workspace_id, archived_at) VALUES
      ('${ids.condominiumA}', '${ids.workspaceA}', NULL),
      ('${ids.condominiumB}', '${ids.workspaceA}', NULL);

    INSERT INTO public.condominium_units(id, workspace_id, condominium_id) VALUES
      ('${ids.unitA}', '${ids.workspaceA}', '${ids.condominiumA}'),
      ('${ids.unitB}', '${ids.workspaceA}', '${ids.condominiumB}');

    INSERT INTO public.condominium_members(id, condominium_id, unit_id, active, data)
    VALUES ('${ids.memberA}', '${ids.condominiumA}', '${ids.unitA}', true,
      '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb);

    INSERT INTO public.condominium_installments
      (id, workspace_id, condominium_id, member_id, unit_id, title, due_date, amount, paid_amount, status)
    VALUES
      ('${ids.ownInstallment}', '${ids.workspaceA}', '${ids.condominiumA}', '${ids.memberA}', '${ids.unitA}', 'Rata corretta', '2026-11-20', 100, 20, 'Parzialmente pagato'),
      ('${ids.foreignMemberInstallment}', '${ids.workspaceA}', '${ids.condominiumB}', '${ids.memberA}', '${ids.unitB}', 'Rata altro condominio stesso membro', '2026-11-20', 200, 0, 'Da pagare'),
      ('${ids.foreignUnitInstallment}', '${ids.workspaceA}', '${ids.condominiumB}', NULL, '${ids.unitA}', 'Rata altro condominio stessa unità', '2026-11-20', 300, 0, 'Da pagare'),
      ('${ids.foreignWorkspaceInstallment}', '${ids.workspaceB}', '${ids.condominiumB}', '${ids.memberA}', '${ids.unitB}', 'Rata altro workspace', '2026-11-20', 400, 0, 'Da pagare');

    INSERT INTO public.condominium_ledger_entries
      (id, workspace_id, condominium_id, unit_id, expense_type, entry_date, deliberation_date, description, amount)
    VALUES ('${ids.foreignLedger}', '${ids.workspaceA}', '${ids.condominiumB}', '${ids.unitB}', 'Straordinaria', '2026-11-01', '2026-11-01', 'Delibera altro condominio', 50);

    INSERT INTO public.condominium_expense_allocations
      (id, workspace_id, condominium_id, ledger_entry_id, member_id, amount, paid_amount, due_date, status)
    VALUES ('${ids.foreignAllocation}', '${ids.workspaceA}', '${ids.condominiumB}', '${ids.foreignLedger}', '${ids.memberA}', 50, 0, '2026-12-01', 'Da pagare');

    INSERT INTO public.condominium_fiscal_carryovers
      (id, workspace_id, condominium_id, unit_id, member_id, balance, kind, status)
    VALUES
      ('${ids.ownCarryover}', '${ids.workspaceA}', '${ids.condominiumA}', '${ids.unitA}', NULL, 10, 'Debito', 'Da riportare'),
      ('${ids.foreignCondominiumCarryover}', '${ids.workspaceA}', '${ids.condominiumB}', '${ids.unitA}', NULL, 90, 'Debito', 'Da riportare'),
      ('${ids.foreignWorkspaceCarryover}', '${ids.workspaceB}', '${ids.condominiumB}', '${ids.unitA}', NULL, 70, 'Debito', 'Da riportare');
  `);

  // Model workspace-scoped Supabase RLS: the caller can see workspace A,
  // including multiple condominiums inside that workspace.
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
  assert.equal(before.installments_before.length, 3,
    "Legacy function must reproduce cross-condominium installments linked by member_id/unit_id.");
  assert.equal(Number(before.outstanding_before), 580,
    "Legacy function must reproduce the inflated cross-condominium outstanding amount.");
  assert.equal(before.extraordinary_deliberated_before_due_after.length, 1,
    "Legacy function must reproduce the cross-condominium extraordinary allocation.");
  assert.equal(before.unit_unassigned_carryovers.length, 2,
    "Legacy function must reproduce the cross-condominium unit carryover.");
  assert.equal(before.installments_before.some(row => row.id === ids.foreignWorkspaceInstallment), false,
    "Workspace RLS must continue hiding rows from a workspace the caller cannot access.");
  assert.equal(before.unit_unassigned_carryovers.some(row => row.id === ids.foreignWorkspaceCarryover), false,
    "Workspace RLS must continue hiding carryovers from a workspace the caller cannot access.");

  await db.exec("RESET ROLE");
  await db.exec(migrationSql);
  await db.exec("SET ROLE authenticated");

  const afterResult = await db.query(
    "SELECT public.preview_condominium_member_transfer($1::uuid, $2::uuid, $3::date) AS preview",
    [ids.unitA, ids.memberA, "2026-11-25"]
  );
  const after = afterResult.rows[0].preview;
  assert.deepEqual(after.installments_before.map(row => row.id), [ids.ownInstallment],
    "Corrected function must include only installments in the selected workspace and condominium.");
  assert.equal(Number(after.outstanding_before), 80,
    "Corrected outstanding amount must exclude another condominium's installments.");
  assert.equal(after.extraordinary_deliberated_before_due_after.length, 0,
    "Corrected function must exclude another condominium's extraordinary allocations.");
  assert.deepEqual(after.unit_unassigned_carryovers.map(row => row.id), [ids.ownCarryover],
    "Corrected function must exclude another condominium's unit carryovers.");
  assert.equal(after.review_flags.unit_unassigned_carryovers, true,
    "The selected condominium's own carryover warning must remain intact.");

  console.log(JSON.stringify({
    suite: "BETHAG_MEMBER_TRANSFER_PREVIEW_SCOPE",
    status: "PASS",
    legacy_defect_reproduced: {
      cross_condominium_installments: before.installments_before.length,
      inflated_outstanding_before: Number(before.outstanding_before),
      foreign_extraordinary_allocations: before.extraordinary_deliberated_before_due_after.length,
      foreign_unit_carryovers: before.unit_unassigned_carryovers.length - 1,
      foreign_workspace_rows_hidden_by_rls: true
    },
    corrected_preview: {
      selected_installments: after.installments_before.length,
      outstanding_before: Number(after.outstanding_before),
      extraordinary_allocations: after.extraordinary_deliberated_before_due_after.length,
      selected_unit_carryovers: after.unit_unassigned_carryovers.length
    }
  }, null, 2));
} finally {
  await db.close();
}
