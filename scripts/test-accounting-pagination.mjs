import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const paginationSource = await readFile(new URL("../src/lib/accountingPagination.ts", import.meta.url), "utf8");
assert.match(source, /import \{ loadAllPages, loadActiveAllocationUnitMembers \} from "\.\/lib\/accountingPagination"/, "AccountingPage must import the shared pagination helper");
assert.match(paginationSource, /export async function loadAllPages\(queryFactory: \(\) => any\)/, "Accounting loader must use the pagination helper");
assert.match(paginationSource, /const pageSize = 1000/, "Accounting loader must fetch pages in 1,000-row batches");
assert.match(paginationSource, /queryFactory\(\)\.range\(offset, offset \+ pageSize - 1\)/, "Accounting loader must use Supabase range pagination");
assert.match(paginationSource, /if \(page\.length < pageSize\) return \{ data: rows, error: null \}/, "Pagination must terminate after the final partial page");
assert.match(paginationSource, /\.order\("id", \{ ascending: true \}\)/, "Paginated member lookup must have stable id ordering");
assert.match(source, /loadActiveAllocationUnitMembers\(supabase, dbCondominiumId, unitIds\)/, "installment unification must use the paginated active-member lookup");

const tables = [
  "condominium_fiscal_years", "condominium_ledger_entries", "condominium_funds",
  "condominium_tax_obligations", "condominium_legal_cases", "condominium_expense_allocations",
  "condominium_allocation_intakes", "condominium_units", "condominium_members",
  "condominium_millesimal_tables", "condominium_millesimal_values",
  "condominium_consumption_readings", "condominium_allocation_rules",
  "condominium_installments", "condominium_budgets", "condominium_fiscal_carryovers",
  "condominium_accounting_settings", "condominium_fiscal_carryover_compensations",
];
for (const table of tables) {
  assert.ok(source.includes(`loadAllPages(() => supabase.from("${table}")`), `${table} must use pagination`);
}
assert.match(source, /allocationIntakesResult[\s\S]*?if \(result\.error\) throw result\.error/, "Allocation intake query errors must be surfaced");
console.log("Accounting pagination static regression checks passed.");
