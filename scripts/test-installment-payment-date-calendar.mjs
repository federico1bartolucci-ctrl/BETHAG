import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isValidISOCalendarDate } from "../src/lib/isoCalendarDate.mjs";

// Reproduce the old over-escaped regex from savePayment: it expected a
// literal backslash before "d", so an ordinary ISO date was rejected.
const legacyGuard = /^\\d{4}-\\d{2}-\\d{2}$/;
assert.equal(legacyGuard.test("2026-11-26"), false);
assert.equal(isValidISOCalendarDate("2026-11-26"), true);
assert.equal(isValidISOCalendarDate("2024-02-29"), true);
assert.equal(isValidISOCalendarDate("2000-02-29"), true);
assert.equal(isValidISOCalendarDate("1900-02-29"), false);
assert.equal(isValidISOCalendarDate("2025-02-29"), false);
assert.equal(isValidISOCalendarDate("2026-04-31"), false);
assert.equal(isValidISOCalendarDate("2026-13-01"), false);
assert.equal(isValidISOCalendarDate("2026-00-01"), false);
assert.equal(isValidISOCalendarDate("2026-1-01"), false);
assert.equal(isValidISOCalendarDate("2026-01-1"), false);
assert.equal(isValidISOCalendarDate("2026/11/26"), false);
assert.equal(isValidISOCalendarDate(""), false);
assert.equal(isValidISOCalendarDate(null), false);
assert.equal(isValidISOCalendarDate(20261126), false);
assert.equal(isValidISOCalendarDate("0000-01-01"), false);
assert.equal(isValidISOCalendarDate("0001-01-01"), true);

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function savePayment");
assert.ok(start >= 0, "savePayment handler must exist");
const end = source.indexOf("\n  async function ", start + 10);
const savePayment = source.slice(start, end > start ? end : undefined);
assert.ok(source.includes('import { isValidISOCalendarDate } from "./lib/isoCalendarDate.mjs";'));
assert.ok(savePayment.includes("isValidISOCalendarDate(paymentForm.payment_date)"));
assert.ok(!savePayment.includes("Date.parse(paymentForm.payment_date)"));
assert.ok(!savePayment.includes("\\\\d{4}"));

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-installment-payment-date-calendar.mjs"));

console.log("Installment payment ISO calendar-date runtime regression: PASS");
