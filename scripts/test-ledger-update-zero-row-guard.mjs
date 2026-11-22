import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { requireUpdatedLedgerEntry } from "../src/lib/ledgerUpdateResult.mjs";

assert.equal(requireUpdatedLedgerEntry({ data: { id: "ledger-1" }, error: null }), "ledger-1");
assert.throws(
  () => requireUpdatedLedgerEntry({ data: null, error: null }),
  /Il movimento contabile non è stato aggiornato/,
  "A zero-row update must not be reported as a success.",
);
assert.throws(
  () => requireUpdatedLedgerEntry({ data: {}, error: null }),
  /Il movimento contabile non è stato aggiornato/,
  "A response without the updated row id must fail closed.",
);
const databaseError = new Error("database unavailable");
assert.throws(() => requireUpdatedLedgerEntry({ data: null, error: databaseError }), (error) => error === databaseError);

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveLedger(e: React.FormEvent)");
const end = source.indexOf("\n  async function saveFund", start);
assert.ok(start >= 0 && end > start, "saveLedger must be locatable");
const saveLedger = source.slice(start, end);
assert.match(saveLedger, /\.eq\("id", editingLedger\.id\)[\s\S]*?\.eq\("workspace_id", workspaceId\)[\s\S]*?\.select\("id"\)[\s\S]*?\.maybeSingle\(\)/);
assert.match(saveLedger, /requireUpdatedLedgerEntry\(result\)/);
assert.match(saveLedger, /if \(editingLedger\) \{/);
console.log("Ledger update zero-row runtime regression: PASS");
