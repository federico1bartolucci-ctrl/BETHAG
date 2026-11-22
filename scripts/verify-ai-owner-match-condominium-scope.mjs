import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/main.tsx", "utf8");
const start = source.indexOf("const existingMember = condominiumMembers.find((member) => {");
assert.notEqual(start, -1, "AI owner matching block must exist");
const end = source.indexOf("if (existingMember)", start);
assert.notEqual(end, -1, "AI owner matching block boundary must exist");
const block = source.slice(start, end);

assert.match(block, /if \(member\.condominiumId !== savedItem\.id\) return false;/, "Existing owners must be matched only within the current condominium");
assert.match(block, /sameFiscalCode/, "Fiscal-code matching must remain");
assert.match(block, /sameEmail/, "Email matching must remain");
console.log("AI owner condominium-scope regression guard: PASS");
