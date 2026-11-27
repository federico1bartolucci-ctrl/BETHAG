import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasGeneratedInstallmentAllocationMutation } from "../src/lib/allocationInstallmentGuard.mjs";

const unchanged = {
  linkedInstallmentCount: 2,
  originalAmount: 120.5,
  nextAmount: 120.5,
  originalUnitId: "unit-1",
  nextUnitId: "unit-1",
  originalLedgerEntryId: "expense-1",
  nextLedgerEntryId: "expense-1",
};
assert.equal(hasGeneratedInstallmentAllocationMutation(unchanged), false);
assert.equal(hasGeneratedInstallmentAllocationMutation({ ...unchanged, linkedInstallmentCount: 0, nextLedgerEntryId: "expense-2" }), false,
  "allocations without generated installments may be moved");
assert.equal(hasGeneratedInstallmentAllocationMutation({ ...unchanged, nextAmount: 120 }), true,
  "generated installments lock the allocation amount");
assert.equal(hasGeneratedInstallmentAllocationMutation({ ...unchanged, nextUnitId: "unit-2" }), true,
  "generated installments lock the allocated unit");
assert.equal(hasGeneratedInstallmentAllocationMutation({ ...unchanged, nextLedgerEntryId: "expense-2" }), true,
  "generated installments lock the source ledger expense");
assert.equal(hasGeneratedInstallmentAllocationMutation({ ...unchanged, linkedInstallmentCount: null }), true,
  "an unknown installment count fails closed");
assert.equal(hasGeneratedInstallmentAllocationMutation({ ...unchanged, linkedInstallmentCount: "invalid" }), true,
  "a malformed installment count fails closed");

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveAllocation(e: React.FormEvent)");
const end = source.indexOf("function openManualAllocationIntake", start);
assert.ok(start >= 0 && end > start, "saveAllocation handler exists");
const handler = source.slice(start, end);
assert.match(handler, /\.eq\("workspace_id", workspaceId\)/, "installment lookup is workspace-scoped");
assert.match(handler, /\.eq\("condominium_id", dbCondominiumId\)/, "installment lookup is condominium-scoped");
assert.match(handler, /\.eq\("ledger_entry_id", editingAllocation\.ledger_entry_id\)/, "installments are checked against the original expense");
assert.match(handler, /hasGeneratedInstallmentAllocationMutation\(/, "the runtime guard is wired into saveAllocation");
for (const field of ["originalAmount", "nextAmount", "originalUnitId", "nextUnitId", "originalLedgerEntryId", "nextLedgerEntryId"]) {
  assert.match(handler, new RegExp(field + ":"), "guard receives " + field);
}
assert.ok(handler.indexOf("hasGeneratedInstallmentAllocationMutation(") < handler.indexOf("const payload ="),
  "the guard must run before any update/insert payload is written");
console.log("Allocation generated-installment integrity runtime regression: PASS");
