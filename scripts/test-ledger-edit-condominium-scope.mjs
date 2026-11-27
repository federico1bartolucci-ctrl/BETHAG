import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ledgerEditMatchesCondominium } from "../src/lib/ledgerUpdateResult.mjs";

const ledgerA = { id: "ledger-A", condominium_id: "condo-A" };
assert.equal(ledgerEditMatchesCondominium(ledgerA, "condo-A"), true);
assert.equal(ledgerEditMatchesCondominium(ledgerA, "condo-B"), false);
assert.equal(ledgerEditMatchesCondominium(ledgerA, ""), false);
assert.equal(ledgerEditMatchesCondominium({ id: "ledger-A" }, "condo-A"), false);
assert.equal(ledgerEditMatchesCondominium(null, "condo-A"), false);

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveLedger(e: React.FormEvent)");
const end = source.indexOf("\n  async function saveFund", start);
assert.ok(start >= 0 && end > start, "saveLedger must be locatable");
const saveLedger = source.slice(start, end);

const preflight = saveLedger.indexOf("ledgerEditMatchesCondominium(editingLedger, dbCondominiumId)");
const linkedLookup = saveLedger.indexOf(".from(\"condominium_installments\")");
assert.ok(preflight >= 0 && linkedLookup > preflight, "stale cross-condominium edits must be rejected before dependent lookups");
assert.match(saveLedger, /\.eq\("id", editingLedger\.id\)[\s\S]*?\.eq\("workspace_id", workspaceId\)[\s\S]*?\.eq\("condominium_id", dbCondominiumId\)/);
assert.match(saveLedger, /condominium_id: dbCondominiumId/);
assert.match(saveLedger, /setError\("Il movimento contabile selezionato non appartiene più al condominio corrente/);
assert.ok(
  saveLedger.indexOf("setError(\"Il movimento contabile selezionato non appartiene più al condominio corrente") <
  saveLedger.indexOf("setSaving(true)"),
  "scope mismatch must be rejected before any write attempt",
);
console.log("Ledger edit condominium-scope runtime regression: PASS");
