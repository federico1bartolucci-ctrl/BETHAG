import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInvoiceDate } from "../src/lib/invoiceDate.mjs";

test("missing invoice date remains missing", () => {
  assert.equal(parseInvoiceDate(undefined), "");
  assert.equal(parseInvoiceDate(null), "");
  assert.equal(parseInvoiceDate(""), "");
  assert.equal(parseInvoiceDate("   "), "");
});

test("parses Italian and ISO invoice dates", () => {
  assert.equal(parseInvoiceDate("7/2/2026"), "2026-02-07");
  assert.equal(parseInvoiceDate("07-02-2026"), "2026-02-07");
  assert.equal(parseInvoiceDate("2026-02-07"), "2026-02-07");
  assert.equal(parseInvoiceDate("29/02/2024"), "2024-02-29");
  assert.equal(parseInvoiceDate("29/02/2024"), "2024-02-29");
});

test("rejects impossible dates and unsupported formats", () => {
  assert.equal(parseInvoiceDate("31/02/2026"), "");
  assert.equal(parseInvoiceDate("2026-13-01"), "");
  assert.equal(parseInvoiceDate("29/02/2025"), "");
  assert.equal(parseInvoiceDate("31-04-2026"), "");
  assert.equal(parseInvoiceDate("2026-02-07T00:00:00Z"), "");
  assert.equal(parseInvoiceDate("29/02/2025"), "");
  assert.equal(parseInvoiceDate("31-04-2026"), "");
  assert.equal(parseInvoiceDate("2026-02-07T00:00:00Z"), "");
  assert.equal(parseInvoiceDate("not a date"), "");
});
