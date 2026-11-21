import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveYear(");
const end = source.indexOf("\n  async function saveLedger(", start);
assert.ok(start >= 0 && end > start, "saveYear handler must exist");
const handler = source.slice(start, end);
assert.match(handler, /editingYear\s*\?\s*supabase/);
assert.match(handler, /\.update\(payload\)/, "editing a fiscal year must use UPDATE");
assert.match(handler, /\.eq\("id", editingYear\.id\)/, "update must target the existing fiscal year ID");
assert.match(handler, /\.eq\("condominium_id", dbCondominiumId\)/, "update must remain condominium-scoped");
assert.match(handler, /:\s*supabase\s*\.from\("condominium_fiscal_years"\)\s*\.upsert\(payload,\s*\{\s*onConflict:/, "upsert must be reserved for creation");
console.log("Fiscal-year edit regression checks passed.");
