import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInvoiceAmount } from "../src/lib/invoiceAmount.mjs";

test("parses Italian and US grouped amounts and decimal values", () => {
  assert.equal(parseInvoiceAmount("€ 1.234,56"), 1234.56);
  assert.equal(parseInvoiceAmount("1,234.56"), 1234.56);
  assert.equal(parseInvoiceAmount("1234,5"), 1234.5);
  assert.equal(parseInvoiceAmount("1234.50"), 1234.5);
  assert.equal(parseInvoiceAmount("1234"), 1234);
});

test("rejects malformed OCR amounts rather than stripping letters", () => {
  assert.equal(parseInvoiceAmount("abc 123"), 0);
  assert.equal(parseInvoiceAmount("12abc34"), 0);
  assert.equal(parseInvoiceAmount("1.23.4"), 0);
  assert.equal(parseInvoiceAmount("1,2,3"), 0);
  assert.equal(parseInvoiceAmount("12,3456"), 0);
  assert.equal(parseInvoiceAmount(""), 0);
  assert.equal(parseInvoiceAmount(undefined), 0);
});

test("preserves finite numeric inputs and rejects non-finite values", () => {
  assert.equal(parseInvoiceAmount(45.6), 45.6);
  assert.equal(parseInvoiceAmount(Infinity), 0);
});
