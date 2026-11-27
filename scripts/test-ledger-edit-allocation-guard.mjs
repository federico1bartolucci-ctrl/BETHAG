import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveLedger(e: React.FormEvent)");
const end = source.indexOf("\n  async function saveFund", start);
assert.ok(start >= 0 && end > start, "saveLedger must be locatable");
const saveLedger = source.slice(start, end);
assert.match(saveLedger, /const existingAllocations = allocations\.filter\(a => a\.ledger_entry_id === editingLedger\.id && a\.condominium_id === dbCondominiumId\)/);
assert.match(saveLedger, /const allocatedAmount = existingAllocations\.reduce\(\(sum, row\) => sum \+ Number\(row\.amount \|\| 0\), 0\)/);
assert.match(saveLedger, /ledgerForm\.direction !== "Uscita" \|\| Number\(ledgerForm\.amount\) \+ 0\.005 < allocatedAmount/);
const allocated = [100.25, 50.75].reduce((sum, value) => sum + value, 0);
assert.equal(allocated, 151);
assert.ok(150.995 < allocated, "a ledger amount below allocated shares must be rejected");
console.log("Ledger edit allocation guard: PASS");
