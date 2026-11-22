import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.match(source, /async function loadWorkspaceRows\(table: string, workspaceId: string, orderColumn: string, ascending = true\)/);
assert.match(source, /\.range\(offset, offset \+ pageSize - 1\)/);
assert.match(source, /loadWorkspaceRows\("condominium_fiscal_carryovers", workspaceId, "created_at"\)/);
assert.match(source, /if \(result\.error\) return \{ data: null, error: result\.error \}/);
assert.match(packageJson.scripts.test, /test-accounting-carryover-pagination\.mjs/);
console.log("Accounting fiscal carryover pagination guard passed.");
