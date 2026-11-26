import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function deleteWorkspaceRecord(");
const end = source.indexOf("export async function deletePortalMember(", start);
assert.ok(start >= 0 && end > start, "workspace delete helper boundaries exist");
const helper = source.slice(start, end);

assert.match(helper, /\.delete\(\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("legacy_id", legacyId\)[\s\S]*\.select\("legacy_id"\)/,
  "workspace record deletion must remain scoped and return affected records");
assert.match(helper, /if \(error\) throw error;/,
  "database errors must propagate");
assert.match(helper, /if \(!data\?\.length\) throw new Error\("Record non trovato o già eliminato\."\);/,
  "zero-row deletion must fail closed rather than report success");
console.log("Workspace record zero-row deletion regression passed.");
