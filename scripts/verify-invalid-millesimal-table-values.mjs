import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/AccountingPage.tsx", "utf8");
assert.ok(source.includes("const invalidEligibleValues = eligible.some(v => !Number.isFinite(Number(v.value)) || Number(v.value) < 0);"), "Table validation must reject negative or non-finite values for non-excluded units.");
assert.ok(source.includes("!invalidEligibleValues && Number.isFinite(sum)"), "A table with invalid values or non-finite sums must not be complete.");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(packageJson.scripts.test.includes("verify-invalid-millesimal-table-values.mjs"), "Regression guard must run from npm test.");
console.log("Invalid millesimal table value guard passed.");
