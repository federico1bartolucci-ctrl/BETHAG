import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source = readFileSync("src/AccountingPage.tsx", "utf8");
const preview = source.match(/const eligible = units[\\s\\S]*?\\.filter\\(u => table\\.scope_mode[\\s\\S]*?\\)\\n      \\.map\\(unit/);
assert.ok(preview, "Automatic allocation preview eligibility filter must exist");
const filter = preview[0];
for (const fallback of ["data?.building_code", "data?.civic_code", "data?.fabbricato"]) {
  assert.ok(filter.includes(fallback), `Preview building scope must support ${fallback}`);
}
console.log("Automatic allocation preview building-scope fallback guard passed.");
