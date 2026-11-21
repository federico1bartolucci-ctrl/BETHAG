import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const start = source.indexOf("const condominiumSupplierLegacyByDbId");
const end = source.indexOf("const mappedCondominiumUnits", start);
assert.ok(start >= 0 && end > start, "supplier legacy-ID mapping block must exist");
const block = source.slice(start, end);
assert.match(block, /for \(let offset = 0; ; offset \+= 1000\)/, "supplier rows must be paginated");
assert.match(block, /\.order\("id", \{ ascending: true \}\)/, "pagination must have stable ID ordering");
assert.match(block, /\.range\(offset, offset \+ 999\)/, "query must request bounded pages");
assert.match(block, /if \(batch\.length < 1000\) break/, "pagination must stop on a short page");
assert.doesNotMatch(block, /\.eq\("workspace_id", workspaceId\);/, "unbounded single-page query must not remain");
console.log("Condominium supplier workspace-pagination regression checks passed.");
