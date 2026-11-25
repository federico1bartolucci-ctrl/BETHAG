import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const baselinePath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261125080000_validate_member_transfer_outgoing_ids_on_confirmation.sql";
const baselineSql = await readFile(baselinePath, "utf8");
const migrationSql = await readFile(migrationPath, "utf8");
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
      member_id uuid,
      due_date date,
      amount numeric NOT NULL DEFAULT 0,
      paid_amount numeric NOT NULL DEFAULT 0,
      ledger_entry_id uuid
    );
    CREATE TABLE public.condominium_ledger_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_type text,
      deliberation_date date,
      description text
    );
    CREATE TABLE public.condominium_fiscal_carryovers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
        ('${ids.unitEmpty}', '${ids.workspace}', '${ids.condominium}');
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
          '{"role":"Proprietario","current_owner":true,"position_status":"Attivo"}'::jsonb, 107);
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

  const valid = await call(
    ids.unitValid,
    ids.memberValidA,
    "2026-11-29",
    payload([ids.memberValidA, ids.memberValidB])
  );
  assert.ok(valid.rows[0].transfer_id, "A complete valid co-owner array must still be accepted.");
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
