import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const sql = await readFile("supabase/rebuild/proposed-forward-migrations/20261122180000_guard_installment_payment_cent_rounding.sql", "utf8");
assert.match(sql, /if round\(p_amount::numeric,2\)<=0 then\s+raise exception 'L''importo del pagamento deve essere almeno un centesimo';\s+end if;/);
const guard=sql.indexOf("if round(p_amount::numeric,2)<=0 then");
const insert=sql.indexOf("insert into public.condominium_payment_movements");
assert.ok(guard>0 && insert>guard, "Rounded-zero guard must run before payment movement insertion.");
console.log("Installment payment cent-rounding static regression PASS.");
