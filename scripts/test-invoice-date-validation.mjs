import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseInvoiceDate } from "../src/lib/invoiceDate.mjs";

assert.equal(parseInvoiceDate(undefined), "");
assert.equal(parseInvoiceDate(null), "");
assert.equal(parseInvoiceDate(""), "");
assert.equal(parseInvoiceDate("   "), "");

assert.equal(parseInvoiceDate("7/2/2026"), "2026-02-07");
assert.equal(parseInvoiceDate("07-02-2026"), "2026-02-07");
assert.equal(parseInvoiceDate("2026-02-07"), "2026-02-07");
assert.equal(parseInvoiceDate("29/02/2024"), "2024-02-29");
assert.equal(parseInvoiceDate("2024-02-29"), "2024-02-29");

for (const invalid of [
  "31/02/2026",
  "29/02/2025",
  "2026-13-01",
  "2026-02-30",
  "00/12/2026",
  "01/00/2026",
  "01/01/0000",
  "not a date",
  "2026-02-07T00:00:00Z",
]) {
  assert.equal(parseInvoiceDate(invalid), "", "invalid invoice date must be rejected: " + invalid);
}

const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
assert.match(backend, /import\s*\{\s*parseInvoiceDate\s*\}\s*from\s*["']\.\/invoiceDate\.mjs["']/);
assert.match(backend, /function parseBethagDate\(value: unknown\): string\s*\{\s*return parseInvoiceDate\(value\);\s*\}/);
const confirmationStart = backend.indexOf("confirmCondominiumInvoice(");
const dateGuardStart = backend.indexOf("const invoiceDate = parseBethagDate(", confirmationStart);
const dateGuardEnd = backend.indexOf("const invoiceNumber", dateGuardStart);
assert.ok(confirmationStart >= 0 && dateGuardStart > confirmationStart && dateGuardEnd > dateGuardStart, "invoice confirmation date guard exists");
const dateGuard = backend.slice(dateGuardStart, dateGuardEnd);
assert.match(dateGuard, /const invoiceDate = parseBethagDate\([\s\S]*?if \(!invoiceDate\)\s*\{[\s\S]*?throw new Error\(/);
console.log("Invoice date strict parsing and confirmation guard regression: PASS");
