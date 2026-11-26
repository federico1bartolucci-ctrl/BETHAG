import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("async function saveBudget(");
const end = source.indexOf("async function savePayment", start);
assert.ok(start >= 0 && end > start, "saveBudget boundaries exist");
const helper = source.slice(start, end);

assert.match(helper, /\.from\("condominium_budgets"\)[\s\S]*\.update\(payload\)[\s\S]*\.eq\("id", editingBudget\.id\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.select\("id"\)[\s\S]*\.maybeSingle\(\)/,
  "budget updates must remain workspace-scoped and return the affected row");
assert.match(helper, /if \(saveError\) throw saveError;/,
  "database errors must propagate");
assert.match(helper, /if \(!updatedBudget\) \{[\s\S]*Nessuna modifica confermata/,
  "zero-row updates must abort before clearing the form or showing success");
assert.match(helper, /\.from\("condominium_budgets"\)\.insert\(payload\)/,
  "new budget creation must remain an insert and not require an update result");
assert.match(packageJson.scripts.test, /test-budget-update-zero-row-guard\.mjs/,
  "budget zero-row regression must run in npm test");
console.log("Budget update zero-row guard regression checks passed.");
