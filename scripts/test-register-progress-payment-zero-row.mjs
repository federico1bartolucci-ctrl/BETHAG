import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { linkRegisterProgressPaymentOrCompensate } from "../src/lib/registerProgressPaymentLink.js";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(source, /linkRegisterProgressPaymentOrCompensate\(/, "partial SAL payments must use the row-count checked link helper");
assert.ok(packageJson.scripts.test.includes("test-register-progress-payment-zero-row.mjs"), "regression test must run through npm test");

function mockClient(updateResult, deleteResult = { error: null }) {
  const calls = [];
  const client = {
    from(table) {
      const state = { table, operation: null, payload: null, filters: [], selected: null };
      const query = {
        update(payload) { state.operation = "update"; state.payload = payload; return query; },
        delete() { state.operation = "delete"; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        select(columns) { state.selected = columns; return query; },
        maybeSingle() { calls.push(state); return Promise.resolve(updateResult); },
        then(resolve, reject) { calls.push(state); return Promise.resolve(deleteResult).then(resolve, reject); },
      };
      return query;
    },
  };
  return { client, calls };
}

const success = mockClient({ data: { id: "progress-1" }, error: null });
assert.equal(
  await linkRegisterProgressPaymentOrCompensate(success.client, "workspace-1", "progress-1", "entry-1", 125),
  "progress-1"
);
assert.equal(success.calls.length, 1, "successful SAL link must not delete the ledger entry");
assert.deepEqual(success.calls[0].filters, [["id", "progress-1"], ["workspace_id", "workspace-1"]]);
assert.equal(success.calls[0].selected, "id");
assert.deepEqual(success.calls[0].payload, { paid_amount: 125, payment_entry_id: "entry-1" });

const zeroRows = mockClient({ data: null, error: null });
await assert.rejects(
  linkRegisterProgressPaymentOrCompensate(zeroRows.client, "workspace-1", "missing-progress", "entry-2", 150),
  /SAL non esiste più o non è aggiornabile/
);
assert.equal(zeroRows.calls.length, 2, "zero-row update must trigger ledger compensation");
assert.deepEqual(zeroRows.calls[1].filters, [["id", "entry-2"], ["workspace_id", "workspace-1"]]);

const updateFailure = mockClient({ data: null, error: new Error("update denied") });
await assert.rejects(
  linkRegisterProgressPaymentOrCompensate(updateFailure.client, "workspace-1", "progress-3", "entry-3", 200),
  /scrittura contabile annullata.*update denied/
);
assert.equal(updateFailure.calls.length, 2, "update error must trigger ledger compensation");

const rollbackFailure = mockClient(
  { data: null, error: null },
  { error: new Error("delete denied") }
);
await assert.rejects(
  linkRegisterProgressPaymentOrCompensate(rollbackFailure.client, "workspace-1", "missing-progress", "entry-4", 225),
  /entry-4.*delete denied/
);
assert.equal(rollbackFailure.calls.length, 2, "failed compensation must be surfaced with ledger ID");
console.log("Register partial-payment zero-row compensation regression checks passed.");
