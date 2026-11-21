import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source=await readFile("src/lib/bethagBackend.ts","utf8");
const tables=[
 ["condominium_fiscal_years",'loadWorkspaceRows("condominium_fiscal_years", "*", "start_date")'],
 ["condominium_ledger_entries",'loadWorkspaceRows("condominium_ledger_entries", "*", "entry_date")'],
 ["condominium_funds",'loadWorkspaceRows("condominium_funds")'],
 ["condominium_expense_allocations",'loadWorkspaceRows("condominium_expense_allocations")'],
 ["condominium_tax_obligations",'loadWorkspaceRows("condominium_tax_obligations", "*", "due_date")'],
 ["condominium_legal_cases",'loadWorkspaceRows("condominium_legal_cases")'],
];
const start=source.indexOf("= await Promise.all([");
const end=source.indexOf("]);",start);
assert.ok(start>=0&&end>start,"Backend-state hydration query list must exist");
const querySection=source.slice(start,end);
for(const [table,expected] of tables){
 assert.ok(querySection.includes(expected),"Backend hydration must paginate "+table);
 assert.ok(!querySection.includes('supabase.from("'+table+'").select("*")'),"No capped query should remain for "+table);
}
console.log("Backend-state accounting pagination regression checks passed.");
