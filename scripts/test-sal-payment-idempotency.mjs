import assert from "node:assert/strict";
import { getSalPaymentIdempotencyKey, clearSalPaymentIdempotencyKey } from "../src/lib/salPaymentIdempotency.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

const storage = memoryStorage();
let sequence = 0;
const createKey = () => `key-${++sequence}`;
const input = {
  storage,
  workspaceId: "workspace-a",
  progressId: "progress-a",
  entryDate: "2026-11-26",
  amount: 40,
  notes: "second tranche",
  createKey,
};
const first = getSalPaymentIdempotencyKey(input);
assert.equal(first, "key-1");
assert.equal(getSalPaymentIdempotencyKey(input), first, "same payload must reuse the pending key");
assert.equal(sequence, 1, "retry must not create another key");

const changedAmount = getSalPaymentIdempotencyKey({ ...input, amount: 30 });
assert.equal(changedAmount, "key-2", "a changed payment amount must get a new key");
const changedNotes = getSalPaymentIdempotencyKey({ ...input, amount: 30, notes: "adjusted" });
assert.equal(changedNotes, "key-3", "a changed request payload must get a new key");

clearSalPaymentIdempotencyKey(storage, "workspace-a", "progress-a");
assert.equal(storage.getItem("bethag:sal-payment:workspace-a:progress-a"), null);

const unavailable = getSalPaymentIdempotencyKey({
  ...input,
  storage: { getItem() { throw new Error("storage disabled"); } },
  currentKey: "in-memory-retry-key",
});
assert.equal(unavailable, "in-memory-retry-key", "in-memory key must survive when session storage is unavailable");

console.log("PASS SAL payment idempotency key persistence and payload matching.");
