import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function deleteCondominiumMember(");
const end = source.indexOf("export async function storeWorkspaceDocuments(", start);
assert.ok(start >= 0 && end > start, "member deletion function must exist");
const fn = source.slice(start, end);

assert.match(fn, /\.from\("condominium_members"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("condominium_id", condominium\.id\)[\s\S]*\.eq\("legacy_id", legacyId\)[\s\S]*\.select\("id"\)/,
  "member deletion must remain scoped to the resolved condominium and legacy member ID and return affected IDs");
assert.match(fn, /if \(error\) throw error;[\s\S]*if \(!deletedMemberRows\?\.length\)/,
  "zero-row deletion must fail closed before owner cleanup");
console.log("PASS condominium member deletion zero-row guard");
