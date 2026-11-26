import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf('.from("condominium_members")');
const end = source.indexOf('.order("created_at")', start);
assert.ok(start >= 0 && end > start, "Accounting condominium_members query exists");
const query = source.slice(start, end);

assert.match(query, /\.select\("id, condominium_id, unit_id, active, name, email, data"\)/,
  "the existing member projection must be preserved");
assert.match(query, /\.eq\("workspace_id", workspaceId\)/,
  "Accounting member hydration must be scoped to the active workspace");
assert.ok(!query.includes(".limit("), "this change must not silently alter existing hydration pagination behavior");
console.log("Accounting members workspace scope regression passed.");
