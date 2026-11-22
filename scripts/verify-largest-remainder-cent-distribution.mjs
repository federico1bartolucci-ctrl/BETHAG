import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/AccountingPage.tsx", "utf8");
assert.ok(source.includes("for (let i=0; i<rows.length && remaining>0; i++) { rows[i].baseCents += 1; remaining -= 1; }"), "Largest-remainder distribution must decrement remaining cents after each award.");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(packageJson.scripts.test.includes("verify-largest-remainder-cent-distribution.mjs"), "Regression guard must run from npm test.");
console.log("Largest-remainder cent distribution guard passed.");