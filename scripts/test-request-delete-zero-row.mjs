import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/main.tsx", "utf8");
const start = source.indexOf("const deleteCondominiumRequest = async");
const end = source.indexOf("const updateCondominiumRequestStatus", start);
assert.notEqual(start, -1, "Request deletion handler must exist.");
assert.notEqual(end, -1, "Request deletion handler must remain delimited.");
const handler = source.slice(start, end);

assert.match(handler, /\.delete\(\)[\s\S]*\.eq\("workspace_id", profile\.workspaceId\)[\s\S]*\.eq\("legacy_id", id\)[\s\S]*\.select\("id"\)/, "Delete must remain scoped and return affected IDs.");
assert.match(handler, /if\s*\(error\)\s*throw\s+error/, "Database errors must trigger rollback of optimistic state.");
assert.match(handler, /if\s*\(!deletedRows\?\.length\)/, "Zero-row deletion must be treated as a failure.");
assert.match(handler, /setCondominiumRequests\(previousRequests\)/, "Failed deletion must restore optimistic state.");
console.log("Condominium request zero-row delete guard: PASS");
