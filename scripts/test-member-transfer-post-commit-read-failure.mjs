import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCommittedMemberTransferOutcome } from "../src/lib/memberTransferPostCommitOutcome.mjs";

const transferId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const incomingId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const transferRecord = { id: transferId, incoming_member_id: incomingId };
const incoming = {
  id: incomingId,
  legacy_id: 701,
  active: true,
  data: { role: "Proprietario", current_owner: true, position_status: "Attivo" },
};

const readFailure = new Error("temporary PostgREST read failure");

// Reproduce the old sequence with a successful/committing RPC followed
// by a PostgREST lookup response containing an error.
let legacyRpcCommitted = false;
async function legacyConfirmAfterRpc(rpc, lookupIncoming) {
  const committedTransferId = await rpc();
  const { data: incomingRows, error: incomingError } = await lookupIncoming();
  if (incomingError) throw incomingError;
  const legacyIncoming = (incomingRows ?? []).find(row =>
    row.data?.role === "Proprietario" && row.data?.current_owner !== false
  ) ?? null;
  if (!legacyIncoming?.legacy_id) {
    throw new Error("Subentro registrato, ma il nuovo proprietario non è stato restituito dal server.");
  }
  return { transferId: committedTransferId, incoming: legacyIncoming };
}
await assert.rejects(
  legacyConfirmAfterRpc(
    async () => {
      legacyRpcCommitted = true;
      return transferId;
    },
    async () => ({ data: null, error: readFailure }),
  ),
  error => error === readFailure,
);
assert.equal(legacyRpcCommitted, true,
  "The baseline must prove that the RPC completed before the follow-up read failed.");

// The corrected outcome preserves the committed transfer ID and explicitly
// requires refresh/reconciliation instead of inviting a duplicate retry.
const partial = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord,
  incoming: null,
  incomingLookupError: readFailure,
});
assert.equal(partial.committed, true);
assert.equal(partial.transferId, transferId);
assert.equal(partial.incoming, null);
assert.equal(partial.reconciliationRequired, true);
assert.equal(partial.reconciliationReason, "incoming_member_lookup_failed");

const transferReadFailure = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord: null,
  transferLookupError: readFailure,
  incoming: null,
});
assert.equal(transferReadFailure.committed, true);
assert.equal(transferReadFailure.reconciliationReason, "transfer_record_lookup_failed");

const missingTransferId = createCommittedMemberTransferOutcome({
  transferId: null,
  transferRecord: null,
  incoming: null,
});
assert.equal(missingTransferId.committed, false);
assert.equal(missingTransferId.reconciliationRequired, true);
assert.equal(missingTransferId.reconciliationReason, "transfer_id_missing");

const missingRecord = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord: null,
  incoming: null,
});
assert.equal(missingRecord.reconciliationReason, "transfer_record_not_visible");

const missingIncomingReference = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord: { id: transferId, incoming_member_id: null },
  incoming: null,
});
assert.equal(missingIncomingReference.reconciliationReason, "incoming_member_reference_missing");

const wrongIncoming = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord,
  incoming: { ...incoming, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
});
assert.equal(wrongIncoming.reconciliationRequired, true);
assert.equal(wrongIncoming.reconciliationReason, "incoming_member_not_visible");

const invalidOwner = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord,
  incoming: { ...incoming, active: false },
});
assert.equal(invalidOwner.reconciliationReason, "incoming_member_not_current_owner");

const success = createCommittedMemberTransferOutcome({
  transferId,
  transferRecord,
  incoming,
});
assert.equal(success.committed, true);
assert.equal(success.transferId, transferId);
assert.equal(success.incoming, incoming);
assert.equal(success.reconciliationRequired, false);
assert.equal(success.reconciliationReason, null);

// Verify production wiring: resolve the incoming member through the exact
// transfer row, and stop the UI from retrying after an already-committed RPC.
const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const backendStart = backend.indexOf("export async function confirmCondominiumMemberTransfer(");
assert.ok(backendStart >= 0, "the production transfer wrapper must exist");
const backendFn = backend.slice(backendStart);
assert.ok(backendFn.includes('from("condominium_member_transfers")'));
assert.ok(backendFn.includes('.select("id,incoming_member_id")'));
assert.ok(backendFn.includes('.eq("workspace_id", workspaceId)'));
assert.ok(backendFn.includes('.eq("condominium_id", outgoing.condominium_id)'));
assert.ok(backendFn.includes('.eq("unit_id", unitId)'));
assert.ok(backendFn.includes('.eq("id", normalizedTransferId)'));
assert.ok(backendFn.includes('.eq("id", transferRecord.incoming_member_id)'));
assert.ok(backendFn.includes("createCommittedMemberTransferOutcome"));
assert.ok(!backendFn.includes('.limit(20)'),
  "the wrapper must not guess the new owner from the latest 20 active unit members");

const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const handlerStart = main.indexOf("const result = await confirmCondominiumMemberTransferBackend(");
const handlerEnd = main.indexOf("const openMemberTransferAccounting", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
const handler = main.slice(handlerStart, handlerEnd);
const partialGuard = handler.indexOf("if (result.reconciliationRequired || !result.incoming)");
const incomingRead = handler.indexOf("const incoming = result.incoming");
assert.ok(partialGuard >= 0 && incomingRead > partialGuard,
  "the UI must handle committed-but-unresolved results before dereferencing incoming");
const partialHandler = handler.slice(partialGuard, incomingRead);
assert.ok(partialHandler.includes('new Event("bethag-backend-refresh")'));
assert.ok(partialHandler.includes("setMemberTransferForm(emptyMemberTransferForm)"));
assert.ok(partialHandler.includes("setSelectedMemberTransferOutgoing(null)"));
assert.ok(partialHandler.includes("closeModal()"));
assert.ok(partialHandler.includes("Non ripetere"));
assert.ok(partialHandler.includes("return;"));

console.log("Member transfer post-commit lookup/reconciliation runtime regression: PASS");
