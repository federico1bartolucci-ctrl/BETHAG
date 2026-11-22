import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isValidISODate } from "../src/lib/accountingDateValidation.mjs";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
assert.match(source, /import \{ isValidISODate \} from "\.\/lib\/accountingDateValidation\.mjs";/);
assert.match(source, /!isValidISODate\(accountingSettingsForm\.accounting_start_date\)/);
assert.match(source, /dates\.some\(\(d,i,a\)=>!isValidISODate\(d\)/);
const start = source.indexOf("async function saveYear(e: React.FormEvent)");
const end = source.indexOf("async function saveLedger(e: React.FormEvent)", start);
assert.ok(start >= 0 && end > start, "saveYear function must be locatable");
const saveYear = source.slice(start, end);
assert.match(saveYear, /!isValidISODate\(yearForm\.start_date\)/);
assert.match(saveYear, /!isValidISODate\(yearForm\.end_date\)/);
assert.ok(saveYear.indexOf("isValidISODate") < saveYear.indexOf(".upsert("), "strict date validation must precede persistence");

for (const valid of ["2026-02-28", "2024-02-29", "2000-02-29"]) assert.equal(isValidISODate(valid), true, valid);
for (const invalid of ["2026-02-29", "2026-02-31", "2026-04-31", "2026-13-01", "26-02-01", ""]) assert.equal(isValidISODate(invalid), false, invalid);
console.log("Accounting and fiscal-year real-date regression passed.");
