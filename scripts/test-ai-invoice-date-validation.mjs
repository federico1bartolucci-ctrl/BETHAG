import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const start = source.indexOf("function parseBethagDate(value: unknown): string {");
const end = source.indexOf("\n}\n\nfunction extractBethagDocumentData", start);
assert.ok(start >= 0 && end > start, "Invoice date parser must exist.");
const parser = source.slice(start, end + 2);
assert.ok(parser.includes("^(\\\\d{1,2})"), "Italian date parsing must use digit matching.");
assert.ok(parser.includes("toValidIsoDate"), "Calendar date validation must be present.");
assert.ok(parser.includes("Number.isFinite(parsed.getTime())"), "Invalid fallback dates must be rejected safely.");
function validateCalendarDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
assert.equal(validateCalendarDate(2026, 12, 31), true);
assert.equal(validateCalendarDate(2026, 2, 29), false);
assert.equal(validateCalendarDate(2024, 2, 29), true);
assert.equal(validateCalendarDate(2026, 13, 1), false);
console.log("AI invoice date parsing guards passed.");
