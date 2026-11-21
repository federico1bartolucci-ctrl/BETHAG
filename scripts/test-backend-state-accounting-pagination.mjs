import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source=await readFile("src/lib/bethagBackend.ts","utf8");
const tables=[
 ["condominium_fiscal_years","start_date"],
 ["condominium_ledger_entries","entry_date"],
 ["condominium_funds","created_at"],
 ["condominium_expense_allocations","created_at"],
 ["condominium_tax_obligations","due_date"],
 ["condominium_legal_cases","created_at"],
];
const loadSection=source.slice(source.indexOf("= await Promise.all(["),source.indexOf("]);",source.indexOf("= await Promise.all(["))+3);
for(const [table,order] of tables){
 assert.match(loadSection,new RegExp('loadWorkspaceRows\\(["\\]'+table+'["\\](?:,\\s*"\\*"\\s*,\\s*"'+order+'")?\\)'),"Backend hydration must paginate "+table);
}
assert.doesNotMatch(loadSection,/supabase\.from\("(?:condominium_fiscal_years|condominium_ledger_entries|condominium_funds|condominium_expense_allocations|condominium_tax_obligations|condominium_legal_cases)"\)\.select\("\*"\)/,"Accounting hydration must not retain capped single-page queries");
console.log("Backend-state accounting pagination regression checks passed.");
