import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../src/AccountingPage.tsx",import.meta.url),"utf8");
const start=source.indexOf("for (const result of ["); const end=source.indexOf("]) {",start);
assert.ok(start>=0&&end>start,"load result error-check loop must exist");
const checked=source.slice(start,end);
assert.match(checked,/allocationIntakesResult/,"allocation intake query errors must be checked before state is replaced");
console.log("Accounting allocation intake load-error regression passed.");
