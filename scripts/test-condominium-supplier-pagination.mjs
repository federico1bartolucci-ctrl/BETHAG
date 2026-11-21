import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");

// The read-only mapping path must page condominium_suppliers as well.
assert.match(
  source,
  /loadWorkspaceRows\(\s*"condominium_suppliers",\s*"id,condominium_id,business_name,data",\s*null\s*\)/,
  "condominium supplier mapping must use the paginated workspace loader"
);

// The sync path must page every supplier before checking whether an existing
// condominium supplier matches; otherwise rows after PostgREST's cap may be
// missed and duplicates inserted repeatedly.
const syncStart = source.indexOf("const condominiumSuppliers: any[] = [];");
assert.notEqual(syncStart, -1, "sync supplier lookup must collect paginated rows");
const syncEnd = source.indexOf("const genericSuppliersByLegacyId", syncStart);
assert.notEqual(syncEnd, -1, "supplier pagination block must precede supplier matching");
const lookup = source.slice(syncStart, syncEnd);
assert.match(lookup, /for\s*\(\s*let\s+offset\s*=\s*0\s*;\s*;\s*offset\s*\+=\s*1000\s*\)/, "supplier lookup must iterate pages");
assert.match(lookup, /\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/, "supplier pagination must use stable ordering");
assert.match(lookup, /\.range\(offset,\s*offset\s*\+\s*999\s*\)/, "supplier lookup must request 1,000-row pages");
assert.match(lookup, /condominiumSuppliers\.push\(\.\.\.batch\)/, "supplier lookup must retain every page");
console.log("Condominium supplier pagination regression checks passed.");
