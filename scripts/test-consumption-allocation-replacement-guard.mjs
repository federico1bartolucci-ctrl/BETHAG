import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationPath = "supabase/migrations/20261121120000_guard_consumption_allocation_replacement.sql";
const sql = readFileSync(migrationPath, "utf8");
const functionBody = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.generate_consumption_allocations"));

const guardIndex = functionBody.indexOf("allocation_basis is distinct from ('Consumo - '||trim(p_service_type))");
const deleteIndex = functionBody.indexOf("delete from public.condominium_expense_allocations");

assert.notEqual(guardIndex, -1, "replacement guard must reject non-consumption allocation rows");
assert.notEqual(deleteIndex, -1, "function must retain its replacement delete");
assert.ok(guardIndex < deleteIndex, "guard must execute before any allocation deletion");
assert.match(functionBody, /raise exception 'La spesa contiene ripartizioni non basate sui consumi/);
assert.match(functionBody, /for update;/, "ledger entry must remain locked during replacement");

console.log("Consumption allocation replacement guard regression checks passed.");
