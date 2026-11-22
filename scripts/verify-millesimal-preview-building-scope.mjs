import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source = readFileSync("src/AccountingPage.tsx", "utf8");
const start = source.indexOf("const eligible = units");
const end = source.indexOf(".map(unit =>", start);
assert.ok(start >= 0 && end > start, "Automatic allocation preview eligibility filter must exist");
const filter = source.slice(start, end);
for (const fallback of ["data?.building_code", "data?.civic_code", "data?.fabbricato"]) {
  assert.ok(filter.includes(fallback), `Preview building scope must support ${fallback}`);
}
console.log("Automatic allocation preview building-scope fallback guard passed.");
