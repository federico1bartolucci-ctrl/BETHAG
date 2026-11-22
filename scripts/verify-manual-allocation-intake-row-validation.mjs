import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/AccountingPage.tsx", "utf8");
for (const snippet of [
  "const condominiumUnitIds = new Set(units.filter(u => u.condominium_id === dbCondominiumId)",
  "!Number.isFinite(rowAmount) || rowAmount < 0",
  "Math.abs(rowAmount * 100 - Math.round(rowAmount * 100)) >= 1e-7",
  "!Number.isFinite(rowMillesimi) || rowMillesimi < 0",
  "new Set(unitIds).size !== unitIds.length",
  "if (!Number.isFinite(total))",
  "const expenseAmount = Number(allocationIntakeForm.expense_amount)",
  "Math.abs(expenseAmount * 100 - Math.round(expenseAmount * 100)) >= 1e-7",
  "if (Math.abs(total-Number(allocationIntakeForm.expense_amount||0))>0.005)",
]) assert.ok(source.includes(snippet), `Missing manual allocation validation: ${snippet}`);
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(packageJson.scripts.test.includes("verify-manual-allocation-intake-row-validation.mjs"), "Regression guard must run from npm test.");
console.log("Manual allocation intake row-validation guard passed.");