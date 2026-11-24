import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

assert.match(source, /async function loadAccountingInstallments\(workspaceId: string\)/);
assert.match(source, /\.from\("condominium_installments"\)[\s\S]*?\.range\(offset, offset \+ pageSize - 1\)/);
assert.match(source, /\.order\("due_date", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/);
assert.match(source, /loadAccountingInstallments\(workspaceId\)/);
assert.match(source, /if \(result\.error\) return \{ data: null, error: result\.error \}/);
assert.match(packageJson.scripts.test, /test-accounting-installments-pagination\.mjs/);
console.log("Accounting installments pagination guard passed.");
