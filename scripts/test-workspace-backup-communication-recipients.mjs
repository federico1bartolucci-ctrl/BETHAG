import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareCommunicationRecipientsForBackupRestore } from "../src/lib/backupCommunicationRecipientsRestore.mjs";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const condominiumId = "22222222-2222-4222-8222-222222222222";
const communicationId = "33333333-3333-4333-8333-333333333333";
const memberId = "44444444-4444-4444-8444-444444444444";
const recipientId = "55555555-5555-4555-8555-555555555555";
const replacementRecipientId = "66666666-6666-4666-8666-666666666666";
const otherWorkspaceId = "77777777-7777-4777-8777-777777777777";
const otherCondominiumId = "88888888-8888-4888-8888-888888888888";
const otherMemberId = "99999999-9999-4999-8999-999999999999";
const providerEventId = "evt_communication_recipient_1";
const sentAt = "2026-11-24T10:00:00.000Z";

const manifest = await readFile(new URL("../src/lib/workspaceBackupTables.mjs", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const schema = await readFile(new URL("../supabase/migrations/20261017000001_bethag_baseline_schema.sql", import.meta.url), "utf8");
const indexes = await readFile(new URL("../supabase/migrations/20261017000002_bethag_baseline_indexes_views.sql", import.meta.url), "utf8");
const functionsSql = await readFile(new URL("../supabase/migrations/20261017000003_bethag_baseline_functions.sql", import.meta.url), "utf8");
const sendEmail = await readFile(new URL("../supabase/functions/bethag-send-email/index.ts", import.meta.url), "utf8");

assert.match(packageJson.scripts.test, /test-workspace-backup-communication-recipients\.mjs/, "Recipient backup regression must be wired into npm test.");
assert.match(mainSource, /prepareCommunicationRecipientsForBackupRestore/);
assert.match(mainSource, /table === "communication_recipients"/);

const exportStart = manifest.indexOf("export const WORKSPACE_BACKUP_EXPORT_TABLES");
const restoreStart = manifest.indexOf("export const WORKSPACE_BACKUP_RESTORE_ORDER");
const exportEnd = manifest.indexOf("]);", exportStart);
const restoreEnd = manifest.indexOf("]);", restoreStart);
const exportManifest = manifest.slice(exportStart, exportEnd);
const restoreManifest = manifest.slice(restoreStart, restoreEnd);
assert.equal((exportManifest.match(/"communication_recipients"/g) || []).length, 1);
assert.equal((restoreManifest.match(/"communication_recipients"/g) || []).length, 1);
assert.ok(exportManifest.indexOf('"communication_recipients"') > exportManifest.indexOf('"communications"'));
assert.ok(restoreManifest.indexOf('"communication_recipients"') > restoreManifest.indexOf('"communications"'));

const recipientTableStart = schema.indexOf('CREATE TABLE "public"."communication_recipients"');
const recipientTableEnd = schema.indexOf("\n);", recipientTableStart);
assert.ok(recipientTableStart >= 0 && recipientTableEnd > recipientTableStart);
const recipientTable = schema.slice(recipientTableStart, recipientTableEnd);
for (const column of ["id", "communication_id", "workspace_id", "condominium_id", "member_id", "user_id", "email", "status", "provider_message_id", "provider_event_id", "sent_at", "delivered_at", "bounced_at", "complained_at", "event_type", "queued_at"]) {
  assert.match(recipientTable, new RegExp('"'+column+'"'));
}
assert.match(schema, /communication_recipients_communication_id_fkey" FOREIGN KEY \(communication_id\) REFERENCES communications\(id\)/);
assert.match(schema, /communication_recipients_workspace_id_fkey" FOREIGN KEY \(workspace_id\) REFERENCES workspaces\(id\)/);
assert.match(indexes, /communication_recipients_communication_email_uq/);
assert.match(indexes, /communication_recipients_provider_event_uq/);

const prepareStart = functionsSql.indexOf("CREATE OR REPLACE FUNCTION private.prepare_communication_recipients");
const prepareEnd = functionsSql.indexOf("CREATE OR REPLACE FUNCTION private.prevent_new_installment_for_closing_member", prepareStart);
assert.ok(prepareStart >= 0 && prepareEnd > prepareStart);
const prepareSql = functionsSql.slice(prepareStart, prepareEnd);
assert.match(prepareSql, /delete from public\.communication_recipients[\s\S]*status='pending'/i);
const conflictStart = prepareSql.indexOf("on conflict (communication_id,lower(btrim(email)))");
const conflictEnd = prepareSql.indexOf("select count(*)", conflictStart);
assert.ok(conflictStart >= 0 && conflictEnd > conflictStart);
assert.doesNotMatch(prepareSql.slice(conflictStart, conflictEnd), /\bstatus\s*=/i, "Existing sent/delivered status must not be reset by recipient preparation.");
assert.match(sendEmail, /Idempotency-Key":\s*`bethag-communication-recipient-\$\{recipient\.id\}`/);

const communication = { id: communicationId, workspace_id: workspaceId, condominium_id: condominiumId };
const member = { id: memberId, condominium_id: condominiumId };
const sentRecipient = {
  id: recipientId,
  communication_id: communicationId,
  workspace_id: workspaceId,
  condominium_id: condominiumId,
  member_id: memberId,
  user_id: "destination-user-id",
  email: "Mario.Rossi@example.it",
  name: "Mario Rossi",
  recipient_role: "owner",
  status: "sent",
  provider_message_id: "re_accepted_123",
  provider_event_id: null,
  sent_at: sentAt,
  delivered_at: null,
  bounced_at: null,
  complained_at: null,
  event_type: null,
  queued_at: null,
  error_message: null,
  created_at: sentAt,
  updated_at: sentAt,
};

const restoredSent = prepareCommunicationRecipientsForBackupRestore(
  [sentRecipient],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(restoredSent.skipped, 0);
assert.equal(restoredSent.insertRows.length, 1);
assert.equal(restoredSent.insertRows[0].id, recipientId, "Restore must preserve the recipient UUID used by the provider idempotency key.");
assert.equal(restoredSent.insertRows[0].status, "sent");
assert.equal(restoredSent.insertRows[0].provider_message_id, "re_accepted_123");
assert.equal(restoredSent.insertRows[0].member_id, memberId);
assert.equal(restoredSent.insertRows[0].user_id, null, "A non-portable profile ID must not be replayed on insert.");

const existingSent = { ...sentRecipient, user_id: "local-profile-id" };
const olderPendingBackup = { ...sentRecipient, status: "pending", provider_message_id: null, sent_at: null, user_id: "foreign-profile-id" };
const keepExistingSent = prepareCommunicationRecipientsForBackupRestore(
  [olderPendingBackup],
  workspaceId,
  [existingSent],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(keepExistingSent.updateRows.length, 1);
assert.equal(keepExistingSent.updateRows[0].id, recipientId);
assert.equal(keepExistingSent.updateRows[0].status, "sent", "An older pending backup must not downgrade a destination send.");
assert.equal(keepExistingSent.updateRows[0].provider_message_id, "re_accepted_123");
assert.equal(keepExistingSent.updateRows[0].user_id, "local-profile-id", "Destination profile attribution must be preserved.");

const existingPending = {
  ...sentRecipient,
  id: replacementRecipientId,
  status: "pending",
  provider_message_id: null,
  sent_at: null,
  user_id: null,
};
const restoreSentOverPending = prepareCommunicationRecipientsForBackupRestore(
  [sentRecipient],
  workspaceId,
  [existingPending],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(restoreSentOverPending.updateRows.length, 1);
assert.equal(restoreSentOverPending.updateRows[0].id, replacementRecipientId, "An existing communication/email row keeps its destination UUID.");
assert.equal(restoreSentOverPending.updateRows[0].status, "sent");
assert.equal(restoreSentOverPending.updateRows[0].provider_message_id, "re_accepted_123");

const pendingWithProviderId = prepareCommunicationRecipientsForBackupRestore(
  [{ ...sentRecipient, status: "pending" }],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(pendingWithProviderId.insertRows[0].status, "sent", "Provider acceptance evidence must override a stale pending status.");

const ambiguousPending = prepareCommunicationRecipientsForBackupRestore(
  [{ ...sentRecipient, status: "pending", provider_message_id: null, sent_at: null, provider_event_id: providerEventId }],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(ambiguousPending.insertRows[0].status, "skipped", "Ambiguous provider event history must fail closed rather than become sendable.");
assert.match(ambiguousPending.insertRows[0].error_message, /verifica manuale/i);
assert.equal(ambiguousPending.manualReview, 1);

const foreignMember = { id: otherMemberId, condominium_id: otherCondominiumId };
const detachedMember = prepareCommunicationRecipientsForBackupRestore(
  [{ ...sentRecipient, member_id: otherMemberId }],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [foreignMember]
);
assert.equal(detachedMember.insertRows[0].member_id, null, "A cross-condominium member reference must be cleared while preserving the recipient snapshot.");

const foreignCommunication = { ...communication, workspace_id: otherWorkspaceId };
const foreignScope = prepareCommunicationRecipientsForBackupRestore(
  [sentRecipient],
  workspaceId,
  [],
  [foreignCommunication],
  [condominiumId],
  [member]
);
assert.equal(foreignScope.skipped, 1);
assert.equal(foreignScope.insertRows.length, 0);

const wrongCondominium = prepareCommunicationRecipientsForBackupRestore(
  [{ ...sentRecipient, condominium_id: otherCondominiumId }],
  workspaceId,
  [],
  [communication],
  [condominiumId, otherCondominiumId],
  [member]
);
assert.equal(wrongCondominium.skipped, 1);

const missingCommunication = prepareCommunicationRecipientsForBackupRestore(
  [sentRecipient],
  workspaceId,
  [],
  [],
  [condominiumId],
  [member]
);
assert.equal(missingCommunication.skipped, 1);

const duplicateEvent = prepareCommunicationRecipientsForBackupRestore(
  [
    sentRecipient,
    { ...sentRecipient, id: replacementRecipientId, email: "another@example.it" },
  ],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(duplicateEvent.insertRows.length, 1);
assert.equal(duplicateEvent.skipped, 1, "Duplicate provider event IDs must not violate the unique provider-event index.");

const invalidSent = prepareCommunicationRecipientsForBackupRestore(
  [{ ...sentRecipient, provider_message_id: null }],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(invalidSent.skipped, 1, "A sent row without its provider message ID is not safe to restore as sent.");

const invalidQueued = prepareCommunicationRecipientsForBackupRestore(
  [{ ...sentRecipient, status: "queued", provider_message_id: null, sent_at: null, queued_at: null }],
  workspaceId,
  [],
  [communication],
  [condominiumId],
  [member]
);
assert.equal(invalidQueued.skipped, 1, "A queued row without queued_at is not safe to restore.");

function simulatePrepareCommunicationRecipients(existingRows, activeMembers, generatedId) {
  // Mirrors the SQL function: reset failed to pending, delete pending, then
  // insert current active members with ON CONFLICT updating identity fields only.
  const retained = existingRows
    .filter((row) => !(row.communication_id === communicationId && ["failed", "pending"].includes(row.status)))
    .map((row) => ({ ...row }));
  for (const activeMember of activeMembers) {
    const email = activeMember.email.trim().toLowerCase();
    const index = retained.findIndex((row) =>
      row.communication_id === communicationId && row.email.trim().toLowerCase() === email
    );
    if (index >= 0) {
      retained[index] = {
        ...retained[index],
        member_id: activeMember.id,
        user_id: activeMember.user_id ?? null,
        name: activeMember.name,
        recipient_role: activeMember.recipient_role,
      };
    } else {
      retained.push({
        id: generatedId,
        communication_id: communicationId,
        workspace_id: workspaceId,
        condominium_id: condominiumId,
        member_id: activeMember.id,
        user_id: activeMember.user_id ?? null,
        email,
        name: activeMember.name,
        recipient_role: activeMember.recipient_role,
        status: "pending",
      });
    }
  }
  return retained;
}

const activeMember = { id: memberId, email: "mario.rossi@example.it", name: "Mario Rossi", recipient_role: "owner" };
const afterRestoreThenPrepare = simulatePrepareCommunicationRecipients([restoredSent.insertRows[0]], [activeMember], replacementRecipientId);
const restoredLedgerRow = afterRestoreThenPrepare.find((row) => row.email === "mario.rossi@example.it");
assert.equal(restoredLedgerRow.id, recipientId);
assert.equal(restoredLedgerRow.status, "sent");
assert.equal(`bethag-communication-recipient-${restoredLedgerRow.id}`, `bethag-communication-recipient-${recipientId}`);

const afterMissingBackupThenPrepare = simulatePrepareCommunicationRecipients([], [activeMember], replacementRecipientId);
const recreatedRow = afterMissingBackupThenPrepare.find((row) => row.email === "mario.rossi@example.it");
assert.equal(recreatedRow.status, "pending");
assert.notEqual(
  `bethag-communication-recipient-${recreatedRow.id}`,
  `bethag-communication-recipient-${recipientId}`,
  "Omitting the recipient ledger recreates a new provider idempotency key and can resend an already-sent communication."
);

console.log("Workspace backup communication-recipient idempotency regression checks passed.");
