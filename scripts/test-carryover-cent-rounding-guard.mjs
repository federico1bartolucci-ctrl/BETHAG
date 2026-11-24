import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const migration = await readFile("supabase/rebuild/proposed-forward-migrations/20261122170000_guard_carryover_compensation_cent_rounding.sql", "utf8");
assert.match(migration, /v_amount:=round\(p_amount::numeric,2\);/);
assert.match(migration, /if v_amount<=0 then\s+raise exception 'L''importo della compensazione deve essere almeno un centesimo';\s+end if;/);
const roundedGuard = migration.indexOf("if v_amount<=0 then");
const insert = migration.indexOf("insert into public.condominium_fiscal_carryover_compensations");
assert.ok(roundedGuard > 0 && insert > roundedGuard, "Rounded-zero guard must execute before compensation insert.");
console.log("Carryover cent-rounding guard static regression PASS.");
