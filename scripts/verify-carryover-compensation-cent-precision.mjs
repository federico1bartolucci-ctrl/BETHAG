import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const start = source.indexOf("async function compensateCarryover()");
const end = source.indexOf("\n  function flash(", start);
assert.ok(start >= 0 && end > start, "Carryover compensation handler must exist.");
const handler = source.slice(start, end);
const amountValidation = handler.indexOf("hasCentPrecision(amount)");
const residualValidation = handler.indexOf("amount > residual + 0.005");
const rpcCall = handler.indexOf("supabase.rpc(\"compensate_fiscal_carryover\"");
assert.ok(amountValidation >= 0, "Carryover compensation must reject amounts with sub-cent precision.");
assert.ok(residualValidation > amountValidation, "Cent precision must be checked before residual validation.");
assert.ok(rpcCall > residualValidation, "Validation must precede the RPC.");
const hasCentPrecision = value => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
for (const value of [0.01, 1.23, 25.5, 0.1]) assert.equal(hasCentPrecision(value), true, "Valid cent amount should pass.");
for (const value of [0.001, 1.005, 10.005, 0.009]) assert.equal(hasCentPrecision(value), false, "Sub-cent amount must be rejected.");
console.log("Carryover compensation cent-precision guard: PASS");
