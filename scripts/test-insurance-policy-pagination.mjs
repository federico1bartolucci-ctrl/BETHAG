import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/InsurancePoliciesSection.tsx", "utf8");
const loadStart = source.indexOf("const policyRows: any[] = [];");
const loadEnd = source.indexOf("setPolicies(policyRows.map", loadStart);
assert.notEqual(loadStart, -1, "Insurance policy loading must collect paginated rows.");
assert.notEqual(loadEnd, -1, "Paginated rows must be mapped into state.");
const loader = source.slice(loadStart, loadEnd);

assert.match(loader, /for\s*\(let offset = 0;\s*;\s*;\s*offset \+= 1000\)/, "Policy loading must use 1,000-row pages.");
assert.match(loader, /\.range\(offset, offset \+ 999\)/, "Every page must request a bounded 1,000-row range.");
assert.match(loader, /\.eq\("workspace_id", condominium\.workspace_id\)/, "Policy loading must be workspace scoped.");
assert.match(loader, /\.eq\("condominium_id", condominium\.id\)/, "Policy loading must be condominium scoped.");
assert.match(loader, /\.order\("end_date",\s*\{\s*ascending:\s*true,\s*nullsFirst:\s*true\s*\}\)/, "Policy ordering must preserve nullable end dates.");
assert.match(loader, /\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/, "Policy pages must use a stable tie-breaker.");
assert.match(loader, /if\s*\(policyError\)\s*throw\s+policyError/, "Page errors must abort hydration instead of accepting partial results.");
assert.match(loader, /policyRows\.push\(\.\.\.batch\)/, "All pages must be accumulated.");
assert.match(loader, /if\s*\(batch\.length\s*<\s*1000\)\s*break/, "Pagination must stop on the final short page.");
console.log("Insurance policy pagination regression guard: PASS");
