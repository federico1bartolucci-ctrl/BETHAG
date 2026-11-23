import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const start = source.indexOf("function parseBethagAmount(value: unknown): number {");
const end = source.indexOf("\n}\n\nfunction parseBethagDate", start);
assert.ok(start >= 0 && end > start, "amount parser exists");
// Remove TypeScript annotations before evaluating the isolated function in Node.
const parserSource = source
  .slice(start, end + 2)
  .replace("function parseBethagAmount(value: unknown): number {", "function parseBethagAmount(value) {");
const parseBethagAmount = new Function(`return (${parserSource}
)`)();
assert.equal(parseBethagAmount("1.234"), 1234, "single-dot three-digit Italian thousands notation");
assert.equal(parseBethagAmount("1.234,56"), 1234.56, "Italian mixed thousands and decimal notation");
assert.equal(parseBethagAmount("12.345,67"), 12345.67, "larger Italian invoice amount");
assert.equal(parseBethagAmount("1234.56"), 1234.56, "dot decimal notation retained");
assert.equal(parseBethagAmount("1,23"), 1.23, "comma decimal notation retained");
console.log("Italian amount parsing regression checks passed.");
