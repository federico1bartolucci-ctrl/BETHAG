import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const start = source.indexOf("export async function deleteCondominium(");
const end = source.indexOf("export async function deleteCondominiumUnit(", start);
assert.ok(start >= 0 && end > start, "deleteCondominium function must be present");
const body = source.slice(start, end);

assert.ok(body.includes("for (let offset = 0; ; offset += 1000)"), "document paths must be fetched in pages");
assert.match(body, /\.range\(offset, offset \+ 999\)/, "pagination must use explicit 1,000-row ranges");
assert.match(body, /\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/, "pagination must use stable ordering");
assert.match(body, /documents\.push\(\.\.\.batch\)/, "all pages must be accumulated before deletion");
assert.match(body, /if \(batch\.length < 1000\) break/, "pagination must stop only after a short page");
assert.match(body, /const storagePaths = Array\.from\(\s*new Set\(\s*documents\.map/, "paths must be deduplicated from the complete document collection");
console.log("Condominium storage deletion pagination guard passed.");
