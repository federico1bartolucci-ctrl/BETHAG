import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source=readFileSync("src/AccountingPage.tsx","utf8");
const start=source.indexOf("async function saveConsumptionReading");
const end=source.indexOf("function parseCsvLine",start);
assert.ok(start>=0&&end>start,"Consumption save function must exist");
const fn=source.slice(start,end);
assert.ok(fn.includes("Math.abs(consumption-(current-previous))>0.001"),"Manual consumption must match meter-reading delta when both readings are supplied");
console.log("Consumption reading consistency guard passed.");
