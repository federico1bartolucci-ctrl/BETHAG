import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/main.tsx", "utf8");
const savePolicyStart = source.indexOf("const savePolicy = async () => {");
const savePolicyEnd = source.indexOf("const editPolicy =", savePolicyStart);
assert.ok(savePolicyStart >= 0 && savePolicyEnd > savePolicyStart, "savePolicy block must exist");
const block = source.slice(savePolicyStart, savePolicyEnd);
assert.match(block, /const isValidPolicyDate = \(value: string\)/, "policy date validator must be present");
assert.ok(block.includes("if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value) return false;"), "policy dates must be checked for ISO shape");
assert.match(block, /getUTCFullYear\(\).*getUTCMonth\(\).*getUTCDate\(\)/s, "validator must reject impossible calendar dates");
assert.match(block, /end_date < form\.start_date/, "policy end date must not precede start date");
assert.ok(block.indexOf("isValidPolicyDate(form.start_date)") < block.indexOf("getActiveWorkspaceId()"), "date validation must precede backend work");
console.log("Insurance policy date validation static guard: PASS");
