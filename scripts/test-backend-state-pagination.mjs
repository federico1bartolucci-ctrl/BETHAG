import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
assert.match(source, /\.range\(offset, offset \+ 999\)/, "workspace loader must page in 1,000-row chunks");
assert.match(source, /for\s*\(\s*let\s+offset\s*=\s*0\s*;\s*;\s*offset\s*\+=\s*1000\s*\)/, "workspace loader must continue through pages");

const workspaceTables = [
  "condominium_units", "documents", "deadlines", "assemblies", "suppliers",
  "activities", "communications", "condominium_requests", "condominium_works",
  "condominium_fiscal_years", "condominium_ledger_entries", "condominium_funds",
  "condominium_expense_allocations", "condominium_tax_obligations",
  "condominium_legal_cases", "portal_access", "workspace_members",
  "condominium_member_transfers",
];
for (const table of workspaceTables) {
  assert.ok(source.includes(`loadWorkspaceRows("${table}"`) || source.includes(`loadWorkspaceRows(\n      "${table}"`), `${table} must use the paginated workspace loader`);
}
console.log("Backend state pagination regression checks passed.");
