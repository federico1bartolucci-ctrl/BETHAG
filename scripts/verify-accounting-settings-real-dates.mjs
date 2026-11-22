import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
assert.match(source, /function isValidISODate\(value: string\)/);
assert.match(source, /!isValidISODate\(accountingSettingsForm\.accounting_start_date\)/);
assert.match(source, /dates\.some\(\(d,i,a\)=>!isValidISODate\(d\)/);

function isValidISODate(value) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
assert.equal(isValidISODate("2026-02-28"), true);
assert.equal(isValidISODate("2024-02-29"), true);
assert.equal(isValidISODate("2026-02-29"), false);
assert.equal(isValidISODate("2026-02-31"), false);
assert.equal(isValidISODate("2026-13-01"), false);
assert.equal(isValidISODate("26-02-01"), false);
console.log("Accounting settings real-date guard passed.");
