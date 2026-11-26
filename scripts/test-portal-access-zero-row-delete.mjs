import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function deletePortalMember(");
const end = source.indexOf("export async function deleteCondominium(", start);
assert.ok(start >= 0 && end > start, "portal delete helper boundaries exist");
const helper = source.slice(start, end);

assert.match(helper, /\.from\("portal_access"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("legacy_id", legacyId\)[\s\S]*\.select\("id"\)/,
  "portal access deletion must remain workspace-scoped and return affected row IDs");
assert.match(helper, /if \(error\) throw error;/,
  "backend errors must propagate");
assert.match(helper, /if \(!data\?\.length\) throw new Error\("Accesso al Portale non trovato o già eliminato\."\);/,
  "zero-row deletion must fail closed");
console.log("Portal access zero-row delete guard regression passed.");
