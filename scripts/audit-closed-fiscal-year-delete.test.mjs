import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function remove(table: string, id: string, label: string)");
assert.notEqual(start, -1, "generic remove handler must exist");
const end = source.indexOf("\n  function openLedger", start);
const remove = source.slice(start, end);
assert.match(remove, /table === "condominium_fiscal_years"/, "fiscal year delete must have a dedicated guard");
assert.match(remove, /\.eq\("workspace_id", workspaceId\)/, "fiscal-year lookup must be workspace-scoped");
assert.match(remove, /if \(fiscalYearLookupError\)/, "lookup errors must stop deletion");
assert.match(remove, /fiscalYearRow\?\.status === "Chiuso"/, "closed fiscal years must be blocked");
assert.match(remove, /Un esercizio contabile chiuso non può essere eliminato/, "block must explain the reason");
assert.ok(remove.indexOf("fiscalYearRow?.status === \"Chiuso\"") < remove.indexOf("window.confirm"), "closed-year guard must precede confirmation and delete");
console.log("Closed fiscal year deletion guard: static checks passed");
