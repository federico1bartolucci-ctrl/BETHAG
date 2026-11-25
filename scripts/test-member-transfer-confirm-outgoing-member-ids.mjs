import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baselinePath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261125080000_validate_member_transfer_outgoing_ids_on_confirmation.sql";
const unitAllocationMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261125090001_include_unit_unassigned_allocations_in_transfer_confirmation.sql";
const snapshotScopeMigrationPath = "supabase/rebuild/proposed-forward-migrations/20261125102000_scope_member_transfer_confirmation_snapshot_to_unit.sql";
const baselineSql = await readFile(baselinePath, "utf8");
const migrationSql = await readFile(migrationPath, "utf8");
const unitAllocationMigrationSql = await readFile(unitAllocationMigrationPath, "utf8");
const snapshotScopeMigrationSql = await readFile(snapshotScopeMigrationPath, "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(packageJson.scripts.test, /test-member-transfer-confirm-outgoing-member-ids\.mjs/,
  "Outgoing-member confirmation regression must be wired into npm test.");

const marker = "CREATE OR REPLACE FUNCTION private.confirm_condominium_member_transfer(";
const endMarker = "$function$\n;";
const start = baselineSql.indexOf(marker);
const end = baselineSql.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "Canonical baseline transfer-confirm function must exist.");
const baselineFunction = baselineSql.slice(start, end + endMarker.length);

const ids = {
  user: "99999999-9999-4999-8999-999999999999",
  workspace: "11111111-1111-4111-8111-111111111111",
  condominium: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  unitMissing: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
  unitNull: "cccccccc-cccc-4ccc-8ccc-cccccccccc02",
  unitMissingFixed: "cccccccc-cccc-4ccc-8ccc-cccccccccc03",
  unitNullFixed: "cccccccc-cccc-4ccc-8ccc-cccccccccc04",
  unitValid: "cccccccc-cccc-4ccc-8ccc-cccccccccc05",
  unitEmpty: "cccccccc-cccc-4ccc-8ccc-cccccccccc06",
  memberMissing: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01",
  memberNull: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02",
  memberMissingFixed: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03",
  memberNullFixed: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee04",
  memberValidA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee05",
  memberValidB: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee06",
  memberEmpty: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee07",
  unitValidUnassignedAllocation: "30000000-0000-4000-8000-000000000001",
  unitSnapshotBaseline: "cccccccc-cccc-4ccc-8ccc-cccccccccc07",
  unitSnapshotFixed: "cccccccc-cccc-4ccc-8ccc-cccccccccc08",
  memberSnapshotBaselineA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee08",
  memberSnapshotBaselineB: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee09",
  memberSnapshotFixedA: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee10",
  memberSnapshotFixedB: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee11",
  ledgerSnapshotBaselineSelected: "20000000-0000-4000-8000-000000000003",
  ledgerSnapshotBaselineOther: "20000000-0000-4000-8000-000000000004",
  ledgerSnapshotFixedSelected: "20000000-0000-4000-8000-000000000005",
  ledgerSnapshotFixedOther: "20000000-0000-4000-8000-000000000006",
  allocationSnapshotBaselineSelected: "30000000-0000-4000-8000-000000000002",
  allocationSnapshotBaselineOther: "30000000-0000-4000-8000-000000000003",
  allocationSnapshotFixedSelected: "30000000-0000-4000-8000-000000000004",
  allocationSnapshotFixedOther: "30000000-0000-4000-8000-000000000005",
  missingId: "f1111111-1111-4111-8111-111111111111"
};

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$ SELECT '${ids.user}'::uuid $$;
    CREATE FUNCTION private.can_manage_workspace_module(uuid, text) RETURNS boolean
      LANGUAGE sql STABLE
      AS $$ SELECT true $$;

    CREATE TABLE public.condominiums (
      id uuid PRIMARY KEY,
      archived_at timestamptz
    );
    CREATE TABLE public.condominium_units (
      id uuid PRIMARY KEY,
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL
    );
    CREATE TABLE public.condominium_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id uuid NOT NULL,
      user_id uuid,
      name text,
      email text,
      role text,
      active boolean NOT NULL DEFAULT true,
      permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      legacy_id bigint,
      unit_id uuid
    );
    CREATE TABLE public.condominium_member_transfers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid NOT NULL,
      outgoing_member_id uuid NOT NULL,
      incoming_member_id uuid,
      transfer_date date NOT NULL,
      transfer_type text NOT NULL,
      status text NOT NULL,
      notes text NOT NULL DEFAULT '',
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by uuid
    );
    CREATE TABLE public.condominium_installments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      member_id uuid,
      unit_id uuid,
      due_date date,
      amount numeric NOT NULL DEFAULT 0,
      paid_amount numeric NOT NULL DEFAULT 0,
      title text,
      status text,
      fiscal_year_id uuid
    );
    CREATE TABLE public.condominium_expense_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid,
      condominium_id uuid,
      unit_id uuid,
      member_id uuid,
      due_date date,
      amount numeric NOT NULL DEFAULT 0,
      paid_amount numeric NOT NULL DEFAULT 0,
      ledger_entry_id uuid,
      status text
    );
    CREATE TABLE public.condominium_ledger_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid,
      expense_type text,
      deliberation_date date,
      description text
    );
    CREATE TABLE public.condominium_fiscal_carryovers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      unit_id uuid,
      member_id uuid,
      balance numeric NOT NULL DEFAULT 0,
      kind text,
      status text,
      source_fiscal_year_id uuid,
      target_fiscal_year_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.portal_access (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      condominium_id uuid NOT NULL,
      member_id uuid,
      active boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.workspace_members (
      workspace_id uuid NOT NULL,
      condominium_id uuid,
      legacy_id bigint,
      role text,
      active boolean NOT NULL DEFAULT true
    );
    INSERT INTO public.condominiums(id, archived_at)
      VALUES ('${ids.condominium}', NULL);
    INSERT INTO public.condominium_units(id, workspace_id, condominium_id)
      VALUES
        ('${ids.unitMissing}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitNull}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitMissingFixed}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitNullFixed}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitValid}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitEmpty}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitSnapshotBaseline}', '${ids.workspace}', '${ids.condominium}'),
        ('${ids.unitSnapshotFixed}', '${ids.workspace}', '${ids.condominium}');
    INSERT INTO public.condominium_members(id, condominium_id, unit_id, active, role, data, legacy_id)
      VALUES
        ('${ids.memberMissing}', '${ids.condominium}', '${ids.unitMissing}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 101),
        ('${ids.memberNull}', '${ids.condominium}', '${ids.unitNull}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 102),
        ('${ids.memberMissingFixed}', '${ids.condominium}', '${ids.unitMissingFixed}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 103),
        ('${ids.memberNullFixed}', '${ids.condominium}', '${ids.unitNullFixed}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 104),
        ('${ids.memberValidA}', '${ids.condominium}', '${ids.unitValid}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 105),
        ('${ids.memberValidB}', '${ids.condominium}', '${ids.unitValid}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 106),
        ('${ids.memberEmpty}', '${ids.condominium}', '${ids.unitEmpty}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 107),
        ('${ids.memberSnapshotBaselineA}', '${ids.condominium}', '${ids.unitSnapshotBaseline}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 108),
        ('${ids.memberSnapshotBaselineB}', '${ids.condominium}', '${ids.unitSnapshotBaseline}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 109),
        ('${ids.memberSnapshotFixedA}', '${ids.condominium}', '${ids.unitSnapshotFixed}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 110),
        ('${ids.memberSnapshotFixedB}', '${ids.condominium}', '${ids.unitSnapshotFixed}', true, 'resident',
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 111);
  `);

  await db.exec(baselineFunction);
  const payload = (outgoingIds) => JSON.stringify({
    transfer_scope: "whole_property",
    outgoing_member_ids: outgoingIds,
    incoming_members: [{ name: "Nuovo proprietario", ownership_share: 100 }]
  });
  const call = (unitId, memberId, date, data) => db.query(
    "SELECT private.confirm_condominium_member_transfer($1::uuid,$2::uuid,$3::text,$4::text,NULL::uuid,$5::date,'Vendita','',$6::jsonb) AS transfer_id",
    [unitId, memberId, "Nuovo proprietario", null, date, data]
  );
  const getMember = (id) => db.query(
    "SELECT active, data->>'position_status' AS position_status FROM public.condominium_members WHERE id=$1::uuid",
    [id]
  );

  // Reproduce the defect against the canonical pre-fix function.
  for (const item of [
    { unit: ids.unitMissing, member: ids.memberMissing, date: "2026-11-25", list: [ids.memberMissing, ids.missingId], label: "non-existent outgoing ID" },
    { unit: ids.unitNull, member: ids.memberNull, date: "2026-11-26", list: [ids.memberNull, null], label: "NULL outgoing ID" }
  ]) {
    const result = await call(item.unit, item.member, item.date, payload(item.list));
    assert.ok(result.rows[0].transfer_id, "Baseline confirmation unexpectedly rejected " + item.label);
    const state = await getMember(item.member);
    assert.equal(state.rows[0].active, true);
    assert.equal(state.rows[0].position_status, "In chiusura",
      "Baseline should move the valid primary member to In chiusura despite " + item.label);
  }
  const baselineTransfers = await db.query(
    "SELECT count(*)::int AS count FROM public.condominium_member_transfers"
  );
  assert.equal(baselineTransfers.rows[0].count, 2);
  console.log("PASS baseline reproduction: confirmation accepts missing and NULL outgoing-member IDs and creates uncloseable transfer records.");

  await db.exec(migrationSql);
  await db.exec(unitAllocationMigrationSql);
  await db.exec(`
    INSERT INTO public.condominium_expense_allocations(
      id, workspace_id, condominium_id, unit_id, member_id, amount, paid_amount, due_date, status
    ) VALUES (
      '${ids.unitValidUnassignedAllocation}', '${ids.workspace}', '${ids.condominium}',
      '${ids.unitValid}', NULL, 40, 10, '2026-12-01', 'Parzialmente pagato'
    );
  `);
  await db.exec(`
    INSERT INTO public.condominium_installments
      (workspace_id, condominium_id, member_id, unit_id, due_date, amount, paid_amount, title, status)
    VALUES
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotBaselineA}', '${ids.unitSnapshotBaseline}', '2026-11-10', 100, 25, 'Unit A before', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotBaselineA}', '${ids.unitEmpty}', '2026-11-10', 900, 450, 'Other unit before', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', NULL, '${ids.unitSnapshotBaseline}', '2026-11-10', 40, 10, 'Unit A unassigned', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotBaselineA}', NULL, '2026-11-10', 10, 2, 'Legacy unit-null', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotBaselineA}', '${ids.unitSnapshotBaseline}', '2026-12-10', 20, 5, 'Unit A future', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotBaselineA}', '${ids.unitEmpty}', '2026-12-10', 60, 0, 'Other unit future', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotFixedA}', '${ids.unitSnapshotFixed}', '2026-11-10', 100, 25, 'Unit A fixed before', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotFixedA}', '${ids.unitEmpty}', '2026-11-10', 900, 450, 'Other unit fixed before', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', NULL, '${ids.unitSnapshotFixed}', '2026-11-10', 40, 10, 'Unit A fixed unassigned', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotFixedA}', NULL, '2026-11-10', 10, 2, 'Legacy fixed unit-null', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotFixedA}', '${ids.unitSnapshotFixed}', '2026-12-10', 20, 5, 'Unit A fixed future', 'Aperta'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.memberSnapshotFixedA}', '${ids.unitEmpty}', '2026-12-10', 60, 0, 'Other unit fixed future', 'Aperta');

    INSERT INTO public.condominium_ledger_entries
      (id, workspace_id, condominium_id, unit_id, expense_type, deliberation_date, description)
    VALUES
      ('${ids.ledgerSnapshotBaselineSelected}', '${ids.workspace}', '${ids.condominium}', '${ids.unitSnapshotBaseline}', 'Straordinaria', '2026-11-01', 'Unit A deliberation'),
      ('${ids.ledgerSnapshotBaselineOther}', '${ids.workspace}', '${ids.condominium}', '${ids.unitEmpty}', 'Straordinaria', '2026-11-01', 'Other unit deliberation'),
      ('${ids.ledgerSnapshotFixedSelected}', '${ids.workspace}', '${ids.condominium}', '${ids.unitSnapshotFixed}', 'Straordinaria', '2026-11-01', 'Unit A fixed deliberation'),
      ('${ids.ledgerSnapshotFixedOther}', '${ids.workspace}', '${ids.condominium}', '${ids.unitEmpty}', 'Straordinaria', '2026-11-01', 'Other unit fixed deliberation');

    INSERT INTO public.condominium_expense_allocations
      (id, workspace_id, condominium_id, ledger_entry_id, unit_id, member_id, due_date, amount, paid_amount, status)
    VALUES
      ('${ids.allocationSnapshotBaselineSelected}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotBaselineSelected}', '${ids.unitSnapshotBaseline}', '${ids.memberSnapshotBaselineA}', '2026-11-10', 25, 0, 'Aperta'),
      ('${ids.allocationSnapshotBaselineOther}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotBaselineOther}', '${ids.unitEmpty}', '${ids.memberSnapshotBaselineA}', '2026-11-10', 75, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotBaselineSelected}', NULL, '${ids.memberSnapshotBaselineA}', '2026-11-10', 5, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotBaselineSelected}', NULL, '${ids.memberSnapshotBaselineA}', '2026-12-10', 7, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotBaselineSelected}', '${ids.unitSnapshotBaseline}', '${ids.memberSnapshotBaselineA}', '2026-12-10', 30, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotBaselineOther}', '${ids.unitEmpty}', '${ids.memberSnapshotBaselineA}', '2026-12-10', 70, 0, 'Aperta'),
      ('${ids.allocationSnapshotFixedSelected}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotFixedSelected}', '${ids.unitSnapshotFixed}', '${ids.memberSnapshotFixedA}', '2026-11-10', 25, 0, 'Aperta'),
      ('${ids.allocationSnapshotFixedOther}', '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotFixedOther}', '${ids.unitEmpty}', '${ids.memberSnapshotFixedA}', '2026-11-10', 75, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotFixedSelected}', NULL, '${ids.memberSnapshotFixedA}', '2026-11-10', 5, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotFixedSelected}', NULL, '${ids.memberSnapshotFixedA}', '2026-12-10', 7, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotFixedSelected}', '${ids.unitSnapshotFixed}', '${ids.memberSnapshotFixedA}', '2026-12-10', 30, 0, 'Aperta'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.ledgerSnapshotFixedOther}', '${ids.unitEmpty}', '${ids.memberSnapshotFixedA}', '2026-12-10', 70, 0, 'Aperta');

    INSERT INTO public.condominium_expense_allocations
      (id, workspace_id, condominium_id, unit_id, member_id, amount, paid_amount, due_date, status)
    VALUES
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.unitSnapshotBaseline}', NULL, 40, 10, '2026-12-01', 'Parzialmente pagato'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.unitSnapshotFixed}', NULL, 40, 10, '2026-12-01', 'Parzialmente pagato'),
      (gen_random_uuid(), '${ids.workspace}', '${ids.condominium}', '${ids.unitEmpty}', NULL, 60, 0, '2026-12-01', 'Aperta');

    INSERT INTO public.condominium_fiscal_carryovers
      (workspace_id, condominium_id, unit_id, member_id, balance, kind, status)
    VALUES
      ('${ids.workspace}', '${ids.condominium}', '${ids.unitSnapshotBaseline}', NULL, 5, 'unit', 'open'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.unitEmpty}', NULL, 99, 'unit', 'open'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.unitSnapshotFixed}', NULL, 5, 'unit', 'open'),
      ('${ids.workspace}', '${ids.condominium}', '${ids.unitEmpty}', NULL, 99, 'unit', 'open');
  `);

  const baselineSnapshotTransfer = await call(
    ids.unitSnapshotBaseline,
    ids.memberSnapshotBaselineA,
    "2026-11-28",
    payload([ids.memberSnapshotBaselineA, ids.memberSnapshotBaselineB])
  );
  const baselineSnapshotResult = await db.query(
    "SELECT data->'accounting_snapshot' AS snapshot FROM public.condominium_member_transfers WHERE id=$1::uuid",
    [baselineSnapshotTransfer.rows[0].transfer_id]
  );
  const baselineSnapshot = baselineSnapshotResult.rows[0].snapshot;
  assert.equal(Number(baselineSnapshot.installments_due_before), 1050);
  assert.equal(Number(baselineSnapshot.installments_paid_before), 487);
  assert.equal(Number(baselineSnapshot.installments_residual), 563);
  assert.equal(baselineSnapshot.installments_after.length, 2);
  assert.equal(Number(baselineSnapshot.outstanding_total), 638);
  assert.equal(Number(baselineSnapshot.outstanding_due_after), 75);
  assert.equal(Number(baselineSnapshot.allocations_before), 30);
  assert.equal(baselineSnapshot.extraordinary_deliberated_before_due_after.length, 3);
  assert.equal(baselineSnapshot.unit_unassigned_allocations.length, 1);
  assert.equal(Number(baselineSnapshot.unit_unassigned_allocations_outstanding), 30);
  assert.equal(baselineSnapshot.unit_unassigned_carryovers.length, 1);
  console.log("PASS baseline reproduction: confirmation snapshot includes Unit B member-linked obligations in a Unit A transfer.");

  await db.exec(snapshotScopeMigrationSql);
  const beforeTransfers = await db.query(
    "SELECT count(*)::int AS count FROM public.condominium_member_transfers"
  );
  const beforeMembers = await db.query(
    "SELECT count(*)::int AS count FROM public.condominium_members"
  );

  for (const item of [
    { unit: ids.unitMissingFixed, member: ids.memberMissingFixed, date: "2026-11-27", list: [ids.memberMissingFixed, ids.missingId], label: "non-existent outgoing ID" },
    { unit: ids.unitNullFixed, member: ids.memberNullFixed, date: "2026-11-28", list: [ids.memberNullFixed, null], label: "NULL outgoing ID" }
  ]) {
    let error;
    try {
      await call(item.unit, item.member, item.date, payload(item.list));
    } catch (caught) {
      error = caught;
    }
    assert.ok(error, "Corrected confirmation must reject " + item.label + ".");
    assert.match(String(error.message), /OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT/);
    const state = await getMember(item.member);
    assert.equal(state.rows[0].active, true,
      "Rejected confirmation must not change active status: " + item.label);
    assert.equal(state.rows[0].position_status, "Attivo",
      "Rejected confirmation must not mark the owner In chiusura: " + item.label);
  }

  const afterTransfers = await db.query(
    "SELECT count(*)::int AS count FROM public.condominium_member_transfers"
  );
  const afterMembers = await db.query(
    "SELECT count(*)::int AS count FROM public.condominium_members"
  );
  assert.equal(afterTransfers.rows[0].count, beforeTransfers.rows[0].count,
    "Rejected confirmation must not create transfer records.");
  assert.equal(afterMembers.rows[0].count, beforeMembers.rows[0].count,
    "Rejected confirmation must not create incoming members.");

  const correctedSnapshotTransfer = await call(
    ids.unitSnapshotFixed,
    ids.memberSnapshotFixedA,
    "2026-12-01",
    payload([ids.memberSnapshotFixedA, ids.memberSnapshotFixedB])
  );
  const correctedSnapshotResult = await db.query(
    "SELECT data->'accounting_snapshot' AS snapshot FROM public.condominium_member_transfers WHERE id=$1::uuid",
    [correctedSnapshotTransfer.rows[0].transfer_id]
  );
  const correctedSnapshot = correctedSnapshotResult.rows[0].snapshot;
  assert.equal(Number(correctedSnapshot.installments_due_before), 150);
  assert.equal(Number(correctedSnapshot.installments_paid_before), 37);
  assert.equal(Number(correctedSnapshot.installments_residual), 113);
  assert.equal(correctedSnapshot.installments_after.length, 1);
  assert.equal(Number(correctedSnapshot.outstanding_total), 128);
  assert.equal(Number(correctedSnapshot.outstanding_due_after), 15);
  assert.equal(Number(correctedSnapshot.allocations_before), 30);
  assert.equal(correctedSnapshot.extraordinary_deliberated_before_due_after.length, 2);
  assert.equal(correctedSnapshot.unit_unassigned_allocations.length, 1);
  assert.equal(Number(correctedSnapshot.unit_unassigned_allocations_outstanding), 30);
  assert.equal(correctedSnapshot.unit_unassigned_carryovers.length, 1);
  console.log("PASS corrected confirmation snapshot: other-unit rows excluded; selected-unit and legacy unit-null rows preserved.");

  const valid = await call(
    ids.unitValid,
    ids.memberValidA,
    "2026-11-29",
    payload([ids.memberValidA, ids.memberValidB])
  );
  assert.ok(valid.rows[0].transfer_id, "A complete valid co-owner array must still be accepted.");
  const validSnapshot = await db.query(
    "SELECT data->'accounting_snapshot'->'unit_unassigned_allocations' AS allocations, (data->'accounting_snapshot'->>'unit_unassigned_allocations_outstanding')::numeric AS outstanding FROM public.condominium_member_transfers WHERE id=$1::uuid",
    [valid.rows[0].transfer_id]
  );
  assert.deepEqual(validSnapshot.rows[0].allocations.map(row => row.id), [ids.unitValidUnassignedAllocation],
    "Confirmation snapshot must preserve unit-unassigned allocations for the transferred unit.");
  assert.equal(Number(validSnapshot.rows[0].allocations[0].residual), 30);
  assert.equal(Number(validSnapshot.rows[0].outstanding), 30);
  const validMembers = await db.query(
    "SELECT id, active, data->>'position_status' AS position_status FROM public.condominium_members WHERE id = ANY($1::uuid[]) ORDER BY id",
    [[ids.memberValidA, ids.memberValidB]]
  );
  assert.equal(validMembers.rows.length, 2);
  assert.ok(validMembers.rows.every(row => row.active === true && row.position_status === "In chiusura"));

  const empty = await call(ids.unitEmpty, ids.memberEmpty, "2026-11-30", payload([]));
  assert.ok(empty.rows[0].transfer_id, "An empty list must retain the primary-member fallback.");
  const emptyTransfer = await db.query(
    "SELECT data->'outgoing_member_ids' AS outgoing_ids FROM public.condominium_member_transfers WHERE id=$1::uuid",
    [empty.rows[0].transfer_id]
  );
  assert.deepEqual(emptyTransfer.rows[0].outgoing_ids, [ids.memberEmpty]);
  console.log("PASS corrected confirmation: missing/NULL IDs fail before writes; valid co-owner arrays and empty-array primary fallback still work.");
} finally {
  await db.close();
}
