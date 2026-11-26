import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInvoiceAmount } from "../src/lib/invoiceAmount.mjs";

test("parses Italian and US grouped amounts, decimals and supported currency symbols", () => {
  assert.equal(parseInvoiceAmount("€ 1.234,56"), 1234.56);
  assert.equal(parseInvoiceAmount("1.234,56 €"), 1234.56);
  assert.equal(parseInvoiceAmount("$1,234.56"), 1234.56);
  assert.equal(parseInvoiceAmount("1,234.56"), 1234.56);
  assert.equal(parseInvoiceAmount("1234,5"), 1234.5);
  assert.equal(parseInvoiceAmount("1234.50"), 1234.5);
  assert.equal(parseInvoiceAmount("1234"), 1234);
  assert.equal(parseInvoiceAmount("0,01"), 0.01);
});

test("rejects malformed OCR, embedded currency markers and ambiguous excess decimals", () => {
  for (const value of [
    "abc 123",
    "12abc34",
    "1.23.4",
    "1,2,3",
    "12,3456",
    "1€2",
    "12 34",
    "0,001",
    "0.001",
    "",
    undefined,
  ]) assert.equal(parseInvoiceAmount(value), 0, String(value));
});

test("preserves finite numeric inputs and rejects non-finite values", () => {
  assert.equal(parseInvoiceAmount(45.6), 45.6);
  assert.equal(parseInvoiceAmount(Infinity), 0);
  assert.equal(parseInvoiceAmount(NaN), 0);
});
