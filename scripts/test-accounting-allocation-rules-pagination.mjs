import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.match(source, /async function loadAccountingPagedRows\(table: string, workspaceId: string, orderColumn: string, ascending = true\)/);
assert.match(source, /\.range\(offset, offset \+ pageSize - 1\)/);
assert.match(source, /loadAccountingPagedRows\("condominium_allocation_rules", workspaceId, "priority", false\)/);
assert.match(source, /if \(result\.error\) return \{ data: null, error: result\.error \}/);
assert.match(packageJson.scripts.test, /test-accounting-allocation-rules-pagination\.mjs/);
console.log("Accounting allocation rules pagination guard passed.");
