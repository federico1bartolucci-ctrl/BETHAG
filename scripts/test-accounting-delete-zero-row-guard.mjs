import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("async function remove(table: string");
const end = source.indexOf("function openLedger", start);
assert.ok(start >= 0 && end > start, "accounting remove helper boundaries exist");
const helper = source.slice(start, end);

assert.match(helper, /\.from\(table\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("id", id\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.select\("id"\)[\s\S]*\.maybeSingle\(\)/,
  "deletion must remain scoped to the workspace and return at most one affected row");
assert.match(helper, /if \(deleteError\)[\s\S]*?return;/,
  "database errors must be handled before the success path");
assert.match(helper, /if \(!deletedRow\)[\s\S]*?Nessun elemento eliminato[\s\S]*?return;/,
  "zero-row deletion must stop before showing success or reloading");
assert.match(pkg.scripts.test, /test-accounting-delete-zero-row-guard\.mjs/,
  "accounting deletion regression must run in npm test");
console.log("Accounting deletion zero-row guard regression checks passed.");
