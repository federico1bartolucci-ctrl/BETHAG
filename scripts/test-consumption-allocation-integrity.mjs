import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = "supabase/rebuild/proposed-forward-migrations/20261126133000_guard_consumption_allocation_fiscal_year_and_replacement.sql";
const baselineFunctionsPath = "supabase/migrations/20261017000003_bethag_baseline_functions.sql";
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const migration = await readFile(migrationPath, "utf8");
const baselineFunctions = await readFile(baselineFunctionsPath, "utf8");

assert.ok(packageJson.scripts.test.includes("test-consumption-allocation-integrity.mjs"), "runtime regression must run under npm test");

const baselineStart = baselineFunctions.indexOf("CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(");
const functionOpening = baselineFunctions.indexOf("$function$", baselineStart);
const functionClosing = baselineFunctions.indexOf("$function$", functionOpening + "$function$".length);
const baselineEnd = baselineFunctions.indexOf(";", functionClosing) + 1;
assert.ok(baselineStart >= 0 && functionOpening > baselineStart && functionClosing > functionOpening && baselineEnd > functionClosing, "baseline function must be extractable");
const baselineFunction = baselineFunctions.slice(baselineStart, baselineEnd);

const fiscalGuard = migration.indexOf("v_expense.fiscal_year_id is distinct from p_fiscal_year_id");
const manualGuard = migration.indexOf("allocation_basis is distinct from ('Consumo - '||trim(p_service_type))");
const deleteAllocations = migration.indexOf("delete from public.condominium_expense_allocations");
assert.ok(fiscalGuard >= 0 && fiscalGuard < deleteAllocations, "fiscal-year guard must precede allocation deletion");
assert.ok(manualGuard >= 0 && manualGuard < deleteAllocations, "manual-allocation guard must precede allocation deletion");
assert.match(migration, /CONSUMPTION_FISCAL_YEAR_MISMATCH/);
assert.match(migration, /FOR UPDATE;/);
assert.match(migration, /SECURITY INVOKER/);
assert.match(migration, /SET search_path TO ''/);

const ids = {
  workspace: "10000000-0000-4000-8000-000000000001",
  condominium: "20000000-0000-4000-8000-000000000001",
  expense: "30000000-0000-4000-8000-000000000001",
  fiscalA: "40000000-0000-4000-8000-000000000001",
  fiscalB: "40000000-0000-4000-8000-000000000002",
  unit: "50000000-0000-4000-8000-000000000001",
  originalAllocation: "60000000-0000-4000-8000-000000000001",
};

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA private;
    CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(p_workspace_id uuid, p_module text)
    RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
    CREATE TABLE public.condominium_ledger_entries (
      id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL,
      fiscal_year_id uuid, direction text NOT NULL, amount numeric(14,2) NOT NULL, due_date date
    );
    CREATE TABLE public.condominium_fiscal_years (
      id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, status text NOT NULL
    );
    CREATE TABLE public.condominium_installments (
      workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, ledger_entry_id uuid NOT NULL
    );
    CREATE TABLE public.condominium_units (
      id uuid PRIMARY KEY, workspace_id uuid NOT NULL, condominium_id uuid NOT NULL, unit_code text NOT NULL
    );
    CREATE TABLE public.condominium_consumption_readings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, condominium_id uuid NOT NULL,
      fiscal_year_id uuid NOT NULL, unit_id uuid NOT NULL, service_type text NOT NULL,
      charge_amount numeric, allocation_value numeric, consumption numeric, kwh numeric
    );
    CREATE TABLE public.condominium_expense_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, condominium_id uuid NOT NULL,
      ledger_entry_id uuid NOT NULL, unit_id uuid, allocation_basis text, millesimi numeric,
      amount numeric(14,2) NOT NULL, paid_amount numeric(14,2) NOT NULL DEFAULT 0,
      due_date date, status text NOT NULL, notes text NOT NULL DEFAULT ''
    );
  `);

  // Reproduce the defect with the original baseline function.
  await db.exec(baselineFunction);
  await db.query(
    "INSERT INTO public.condominium_fiscal_years(id,workspace_id,condominium_id,status) VALUES ($1,$2,$3,'Aperto'),($4,$2,$3,'Aperto')",
    [ids.fiscalA, ids.workspace, ids.condominium, ids.fiscalB]
  );
  await db.query(
    "INSERT INTO public.condominium_ledger_entries(id,workspace_id,condominium_id,fiscal_year_id,direction,amount,due_date) VALUES ($1,$2,$3,$4,'Uscita',100.00,$5)",
    [ids.expense, ids.workspace, ids.condominium, ids.fiscalA, "2026-12-31"]
  );
  await db.query(
    "INSERT INTO public.condominium_units(id,workspace_id,condominium_id,unit_code) VALUES ($1,$2,$3,'A-1')",
    [ids.unit, ids.workspace, ids.condominium]
  );
  await db.query(
    "INSERT INTO public.condominium_consumption_readings(workspace_id,condominium_id,fiscal_year_id,unit_id,service_type,charge_amount) VALUES ($1,$2,$3,$4,'Acqua',10)",
    [ids.workspace, ids.condominium, ids.fiscalB, ids.unit]
  );
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,allocation_basis,amount,paid_amount,due_date,status,notes) VALUES ($1,$2,$3,$4,$5,'Consumo - Acqua',77.00,0,$6,'Da pagare','pre-existing generated allocation')",
    [ids.originalAllocation, ids.workspace, ids.condominium, ids.expense, ids.unit, "2026-12-31"]
  );

  const legacy = await db.query(
    "SELECT public.generate_consumption_allocations($1,$2,$3,$4,$5)::int AS generated",
    [ids.workspace, ids.condominium, ids.expense, ids.fiscalB, "Acqua"]
  );
  assert.equal(legacy.rows[0].generated, 1, "baseline function must reproduce cross-year allocation");
  const legacyAllocation = await db.query(
    "SELECT id, amount FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1",
    [ids.expense]
  );
  assert.equal(legacyAllocation.rows.length, 1);
  assert.notEqual(legacyAllocation.rows[0].id, ids.originalAllocation, "baseline function must replace the old allocation");
  assert.equal(Number(legacyAllocation.rows[0].amount), 100, "baseline function must use readings from the wrong fiscal year");

  // Restore the old allocation, then apply the forward-only correction.
  await db.query("DELETE FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1", [ids.expense]);
  await db.query(
    "INSERT INTO public.condominium_expense_allocations(id,workspace_id,condominium_id,ledger_entry_id,unit_id,allocation_basis,amount,paid_amount,due_date,status,notes) VALUES ($1,$2,$3,$4,$5,'Consumo - Acqua',77.00,0,$6,'Da pagare','preserve on rejected request')",
    [ids.originalAllocation, ids.workspace, ids.condominium, ids.expense, ids.unit, "2026-12-31"]
  );
  await db.exec(migration);

  await assert.rejects(
    db.query("SELECT public.generate_consumption_allocations($1,$2,$3,$4,$5)", [ids.workspace, ids.condominium, ids.expense, ids.fiscalB, "Acqua"]),
    /CONSUMPTION_FISCAL_YEAR_MISMATCH/
  );
  let preserved = await db.query(
    "SELECT id, amount, allocation_basis FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1",
    [ids.expense]
  );
  assert.equal(preserved.rows.length, 1);
  assert.equal(preserved.rows[0].id, ids.originalAllocation);
  assert.equal(Number(preserved.rows[0].amount), 77, "mismatch must not delete or replace existing allocations");

  // The manual-allocation guard from the existing draft must also remain effective.
  await db.query("UPDATE public.condominium_expense_allocations SET allocation_basis='Millesimi', amount=55 WHERE id=$1", [ids.originalAllocation]);
  await assert.rejects(
    db.query("SELECT public.generate_consumption_allocations($1,$2,$3,$4,$5)", [ids.workspace, ids.condominium, ids.expense, ids.fiscalA, "Acqua"]),
    /ripartizioni non basate sui consumi/
  );
  preserved = await db.query(
    "SELECT id, amount, allocation_basis FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1",
    [ids.expense]
  );
  assert.equal(preserved.rows.length, 1);
  assert.equal(preserved.rows[0].id, ids.originalAllocation);
  assert.equal(Number(preserved.rows[0].amount), 55);
  assert.equal(preserved.rows[0].allocation_basis, "Millesimi");

  // Matching fiscal years and generated consumption allocations remain valid.
  await db.query("UPDATE public.condominium_expense_allocations SET allocation_basis='Consumo - Acqua', amount=77 WHERE id=$1", [ids.originalAllocation]);
  await db.query(
    "INSERT INTO public.condominium_consumption_readings(workspace_id,condominium_id,fiscal_year_id,unit_id,service_type,charge_amount) VALUES ($1,$2,$3,$4,'Acqua',10)",
    [ids.workspace, ids.condominium, ids.fiscalA, ids.unit]
  );
  const valid = await db.query(
    "SELECT public.generate_consumption_allocations($1,$2,$3,$4,$5)::int AS generated",
    [ids.workspace, ids.condominium, ids.expense, ids.fiscalA, "Acqua"]
  );
  assert.equal(valid.rows[0].generated, 1);
  const regenerated = await db.query(
    "SELECT id, amount, allocation_basis FROM public.condominium_expense_allocations WHERE ledger_entry_id=$1",
    [ids.expense]
  );
  assert.equal(regenerated.rows.length, 1);
  assert.notEqual(regenerated.rows[0].id, ids.originalAllocation);
  assert.equal(Number(regenerated.rows[0].amount), 100);
  assert.equal(regenerated.rows[0].allocation_basis, "Consumo - Acqua");

  console.log("Consumption allocation fiscal-year and replacement integrity runtime regression: PASS (legacy mismatch reproduced, mismatch rejected before deletion, manual allocations preserved, same-year generation retained).");
} finally {
  await db.close();
}
