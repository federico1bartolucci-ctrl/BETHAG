import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(source, /async function loadAccountingFunds\(workspaceId: string\)/);
assert.match(source, /\.from\("condominium_funds"\)[\s\S]*?\.range\(offset, offset \+ pageSize - 1\)/);
assert.match(source, /\.order\("name", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)/);
assert.match(source, /loadAccountingFunds\(workspaceId\)/);
assert.match(source, /if \(result\.error\) return \{ data: null, error: result\.error \}/);
assert.match(packageJson.scripts.test, /test-accounting-funds-pagination\.mjs/);
console.log("Accounting funds pagination regression checks passed.");
