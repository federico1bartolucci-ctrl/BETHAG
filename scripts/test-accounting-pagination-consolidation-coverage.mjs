import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const helper = await readFile("src/lib/accountingPagination.mjs", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

// Consolidated loader must replace all ten independent pagination implementations.
const expectedLoaders = [
  ['condominium_funds', 'name'],
  ['condominium_tax_obligations', 'due_date'],
  ['condominium_expense_allocations', 'due_date'],
  ['condominium_units', 'unit_code'],
  ['condominium_consumption_readings', 'period_end'],
  ['condominium_allocation_rules', 'priority'],
  ['condominium_installments', 'due_date'],
  ['condominium_fiscal_carryovers', 'created_at'],
  ['condominium_fiscal_carryover_compensations', 'created_at'],
];
for (const [table, column] of expectedLoaders) {
  assert.ok(source.includes(`loadWorkspacePaginatedRows(supabase, "${table}", workspaceId`), `missing shared pagination loader for ${table}`);
  assert.ok(source.includes(`"column":"${column}"`) || source.includes(`"column": "${column}"`), `missing ordering column ${column}`);
}

// Legal cases are deliberately excluded from offset pagination and retain their dedicated keyset loader.
assert.match(source, /loadAccountingLegalCases\(supabase, workspaceId\)/);
assert.doesNotMatch(source, /loadWorkspacePaginatedRows\(supabase, "condominium_legal_cases"/);

// Previously unscoped members hydration must remain workspace-scoped.
assert.match(source, /condominium_members[\s\S]{0,180}\.eq\("workspace_id", workspaceId\)/);

// Shared offset helper must enforce workspace scope, deterministic ID tie-break, bounded pages,
// and surface errors instead of silently returning partial data.
assert.match(helper, /\.eq\("workspace_id", workspaceId\)/);
assert.match(helper, /\.range\(offset, offset \+ pageSize - 1\)/);
assert.match(helper, /if \(error\) throw error/);
assert.match(helper, /column === "id"/);
assert.match(helper, /pageSize > 1000/);
assert.match(packageJson.scripts.test, /test-accounting-pagination-consolidation-coverage\.mjs/);

console.log("Accounting pagination consolidation coverage regression checks passed.");
