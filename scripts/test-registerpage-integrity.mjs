import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/RegisterPage.tsx", "utf8");
const docsStart = source.indexOf("async function saveWorkDocuments");
const docsEnd = source.indexOf("async function registerProgressPayment", docsStart);
assert.ok(docsStart >= 0 && docsEnd > docsStart, "Document-link save function must exist");
const saveDocs = source.slice(docsStart, docsEnd);
assert.match(saveDocs, /deleteError/);
assert.ok(saveDocs.indexOf("deleteError") < saveDocs.indexOf("const rows"), "Delete failure must stop before rebuilding links");

const salStart = source.indexOf("async function saveProgress");
const salEnd = source.indexOf("async function saveWorkExpense", salStart);
assert.ok(salStart >= 0 && salEnd > salStart, "SAL save function must exist");
const saveSal = source.slice(salStart, salEnd);
assert.ok(saveSal.indexOf("cumulativeAmount") < saveSal.indexOf(".insert("), "Aggregate SAL validation must run before insert");
assert.match(saveSal, /updateError/);
assert.match(saveSal, /if\s*\(updateError\)\s*throw\s+updateError/);
console.log("RegisterPage integrity regression checks: PASS");
