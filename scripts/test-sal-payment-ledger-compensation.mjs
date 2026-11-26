import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compensateSalPaymentAfterEventFailure } from "../src/lib/salPaymentCompensation.mjs";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const registerPayment = source.slice(source.indexOf("async function registerProgressPayment"), source.indexOf("async function auditWork"));
const recordPayment = source.slice(source.indexOf("async function recordProgressPayment"), source.indexOf("async function saveProgress"));
assert.ok(source.includes('import { compensateSalPaymentAfterEventFailure } from "./lib/salPaymentCompensation.mjs";'), "RegisterPage must import the compensation helper");
assert.ok(registerPayment.includes("compensateSalPaymentAfterEventFailure"), "event failure must use the concurrency-safe compensation helper");
assert.ok(registerPayment.includes("paymentEntryIdBefore:paymentProgress.payment_entry_id"), "compensation must preserve the previous payment-entry reference");
assert.ok(registerPayment.includes("paymentAmount:amount"), "compensation must receive the payment amount");
assert.ok(registerPayment.includes("concurrent-change"), "concurrent payment changes must not be overwritten");
assert.ok(registerPayment.includes("ledger-delete-failed"), "ledger deletion failure must be reported");
assert.ok(registerPayment.includes("rollback-incomplete"), "incomplete compensation must be surfaced");
assert.ok(registerPayment.includes("progressUpdate.select(\"id\").maybeSingle()") && registerPayment.includes("eq(\"paid_amount\",Number(paymentProgress.paid_amount)"), "register payment must use optimistic concurrency for cumulative paid amount");
assert.ok(recordPayment.includes("rollbackLedgerError"), "legacy payment pathway must compensate ledger when SAL link fails");
assert.ok(recordPayment.includes('setError(e?.message||"Impossibile registrare il pagamento SAL.")'), "legacy payment pathway must surface the original and rollback errors");
assert.ok(recordPayment.includes(".is(\"ledger_entry_id\",null).select(\"id\").maybeSingle()"), "legacy payment pathway must prevent concurrent duplicate SAL linking");
assert.ok(registerPayment.includes(".delete().eq(\"id\",data.id).eq(\"workspace_id\",workspaceId).select(\"id\").maybeSingle()") && registerPayment.includes("!rollbackLedgerDeleted"), "register payment compensation must fail closed when ledger deletion affects zero rows");
assert.ok(recordPayment.includes(".delete().eq(\"id\",data.id).eq(\"workspace_id\",workspaceId).select(\"id\").maybeSingle()") && recordPayment.includes("!rollbackLedgerDeleted"), "legacy payment compensation must fail closed when ledger deletion affects zero rows");

function mockSupabase({ progress, ledger, deleteError = null, updateError = null }) {
  const state = { progress: { ...progress }, ledger: new Map(ledger.map((row) => [row.id, { ...row }])) };
  const calls = [];
  const client = {
    from(table) {
      let operation = "";
      let values = null;
      const filters = [];
      const query = {
        update(next) { operation = "update"; values = { ...next }; return query; },
        delete() { operation = "delete"; return query; },
        eq(column, value) { filters.push(["eq", column, value]); return query; },
        is(column, value) { filters.push(["is", column, value]); return query; },
        select() { return query; },
        maybeSingle() {
          calls.push({ table, operation, values, filters: [...filters] });
          if (table === "condominium_ledger_entries" && operation === "delete" && deleteError) return Promise.resolve({ data: null, error: deleteError });
          if (table === "condominium_work_progress" && operation === "update" && updateError) return Promise.resolve({ data: null, error: updateError });
          const matched = table === "condominium_work_progress"
            ? filters.every(([kind, column, value]) => kind === "eq" ? state.progress?.[column] === value : state.progress?.[column] == null) ? state.progress : null
            : [...state.ledger.values()].find((entry) => filters.every(([kind, column, value]) => kind === "eq" ? entry?.[column] === value : entry?.[column] == null));
          if (!matched) return Promise.resolve({ data: null, error: null });
          if (table === "condominium_work_progress" && operation === "update") Object.assign(state.progress, values);
          if (table === "condominium_ledger_entries" && operation === "delete") state.ledger.delete(matched.id);
          return Promise.resolve({ data: { id: matched.id }, error: null });
        },
      };
      return query;
    },
  };
  return { client, state, calls };
}

// 1. Normal compensation atomically restores the SAL and then deletes the ledger entry.
{
  const { client, state, calls } = mockSupabase({
    progress: { id: "sal-1", workspace_id: "ws-1", paid_amount: 30, payment_entry_id: "ledger-a" },
    ledger: [{ id: "ledger-a", workspace_id: "ws-1", amount: 30 }],
  });
  const result = await compensateSalPaymentAfterEventFailure({
    supabase: client, workspaceId: "ws-1", progressId: "sal-1", ledgerEntryId: "ledger-a",
    paidAmountBefore: 0, paymentEntryIdBefore: null, paymentAmount: 30,
  });
  assert.equal(result.status, "compensated");
  assert.equal(state.progress.paid_amount, 0);
  assert.equal(state.progress.payment_entry_id, null);
  assert.equal(state.ledger.has("ledger-a"), false);
  assert.equal(calls.length, 2);
}

// 2. Reproduce the old unconditional rollback clobbering a concurrent payment.
{
  const legacyState = { progress: { paid_amount: 80, payment_entry_id: "ledger-b" }, ledger: new Set(["ledger-a", "ledger-b"]) };
  legacyState.progress.paid_amount = 0;
  legacyState.progress.payment_entry_id = null;
  legacyState.ledger.delete("ledger-a");
  assert.equal(legacyState.progress.paid_amount, 0);
  assert.equal(legacyState.ledger.has("ledger-a"), false);
  assert.equal(legacyState.ledger.has("ledger-b"), true);

  const { client, state } = mockSupabase({
    progress: { id: "sal-1", workspace_id: "ws-1", paid_amount: 80, payment_entry_id: "ledger-b" },
    ledger: [{ id: "ledger-a", workspace_id: "ws-1", amount: 30 }, { id: "ledger-b", workspace_id: "ws-1", amount: 50 }],
  });
  const result = await compensateSalPaymentAfterEventFailure({
    supabase: client, workspaceId: "ws-1", progressId: "sal-1", ledgerEntryId: "ledger-a",
    paidAmountBefore: 0, paymentEntryIdBefore: null, paymentAmount: 30,
  });
  assert.equal(result.status, "concurrent-change");
  assert.equal(state.progress.paid_amount, 80);
  assert.equal(state.progress.payment_entry_id, "ledger-b");
  assert.equal(state.ledger.has("ledger-a"), true);
  assert.equal(state.ledger.has("ledger-b"), true);
}

// 3. If ledger deletion fails, restore the SAL to the committed payment state.
{
  const { client, state } = mockSupabase({
    progress: { id: "sal-1", workspace_id: "ws-1", paid_amount: 30, payment_entry_id: "ledger-a" },
    ledger: [{ id: "ledger-a", workspace_id: "ws-1", amount: 30 }],
    deleteError: new Error("delete unavailable"),
  });
  const result = await compensateSalPaymentAfterEventFailure({
    supabase: client, workspaceId: "ws-1", progressId: "sal-1", ledgerEntryId: "ledger-a",
    paidAmountBefore: 0, paymentEntryIdBefore: null, paymentAmount: 30,
  });
  assert.equal(result.status, "ledger-delete-failed");
  assert.equal(state.progress.paid_amount, 30);
  assert.equal(state.progress.payment_entry_id, "ledger-a");
  assert.equal(state.ledger.has("ledger-a"), true);
}

// 4. If rollback fails, no ledger deletion is attempted and the payment is preserved.
{
  const { client, state } = mockSupabase({
    progress: { id: "sal-1", workspace_id: "ws-1", paid_amount: 30, payment_entry_id: "ledger-a" },
    ledger: [{ id: "ledger-a", workspace_id: "ws-1", amount: 30 }],
    updateError: new Error("rollback unavailable"),
  });
  const result = await compensateSalPaymentAfterEventFailure({
    supabase: client, workspaceId: "ws-1", progressId: "sal-1", ledgerEntryId: "ledger-a",
    paidAmountBefore: 0, paymentEntryIdBefore: null, paymentAmount: 30,
  });
  assert.equal(result.status, "rollback-error");
  assert.equal(state.progress.paid_amount, 30);
  assert.equal(state.progress.payment_entry_id, "ledger-a");
  assert.equal(state.ledger.has("ledger-a"), true);
}

console.log("PASS: SAL payment compensation runtime—normal rollback, concurrent-payment preservation, delete-failure recovery and fail-closed wiring.");
