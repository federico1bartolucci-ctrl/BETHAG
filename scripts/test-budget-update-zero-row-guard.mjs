import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

const start = source.indexOf("async function saveBudget(");
const end = source.indexOf("async function savePayment(", start);
assert.ok(start >= 0 && end > start, "saveBudget function boundaries exist");
const helper = source.slice(start, end);

assert.match(
  helper,
  /from\("condominium_budgets"\)[\s\S]*?\.update\(payload\)[\s\S]*?\.eq\("id", editingBudget\.id\)[\s\S]*?\.eq\("workspace_id", workspaceId\)[\s\S]*?\.select\("id"\)[\s\S]*?\.maybeSingle\(\)/,
  "budget edits must remain scoped and return the updated row",
);
assert.match(helper, /if \(saveError\) throw saveError;/, "backend update errors must propagate");
assert.match(
  helper,
  /if \(!updatedBudget\)[\s\S]*?throw new Error\(/,
  "zero-row budget updates must fail instead of reporting success",
);
assert.match(
  helper,
  /from\("condominium_budgets"\)[\s\S]*?\.insert\(payload\)/,
  "new budget inserts must retain their existing path",
);
assert.match(packageJson.scripts.test, /test-budget-update-zero-row-guard\.mjs/);
console.log("Budget update zero-row guard regression checks passed.");
