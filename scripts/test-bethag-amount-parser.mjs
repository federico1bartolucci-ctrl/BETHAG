import assert from "node:assert/strict";
import { parseBethagAmount as parse } from "../src/lib/parseBethagAmount.mjs";

const cases = [
  ["€ 1.234,56", 1234.56],
  ["1.234,56", 1234.56],
  ["1,234.56", 1234.56],
  ["1234,56", 1234.56],
  ["1.234", 1234],
  ["1,234", 1.234],
  ["12.50", 12.5],
  ["12,50 €", 12.5],
  ["1.234.567,89", 1234567.89],
  ["1,234,567", 1234567],
  ["1 234,56", 1234.56],
  ["−1.234,56", -1234.56],
  ["(1.234,56)", -1234.56],
  [".5", 0.5],
  [1234.56, 1234.56],
];
for (const [input, expected] of cases) assert.equal(parse(input), expected, "parse " + input);
assert.ok(Number.isNaN(parse("not an amount")));
assert.equal(parse("not an amount", 0), 0);
assert.ok(Number.isNaN(parse("1-2")));
console.log("PASS " + (cases.length + 3) + " currency parsing regressions");
