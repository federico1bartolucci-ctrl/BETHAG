import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function saveCondominiumWorkProgress(");
const end = source.indexOf("export async function deleteCondominiumWork(", start);
assert.ok(start >= 0 && end > start, "SAL save helper boundaries exist");
const helper = source.slice(start, end);

assert.match(helper, /\.from\("condominium_ledger_entries"\)[\s\S]*\.update\([\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("id", ledgerEntryId\)[\s\S]*\.select\("id"\)/,
  "ledger update must return affected row IDs while retaining workspace scope");
assert.match(helper, /if \(ledgerUpdateError\) throw ledgerUpdateError;/,
  "database update errors must propagate");
assert.match(helper, /if \(!updatedLedger\?\.length\) throw new Error\("La scrittura contabile del SAL non è stata aggiornata: nessun movimento corrispondente trovato\."\);/,
  "a zero-row ledger update must abort SAL persistence instead of reporting success");
console.log("SAL zero-row ledger update regression passed.");
