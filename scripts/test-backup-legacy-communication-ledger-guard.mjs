import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  formatBackupReadErrors,
  getCommunicationRecipientLedgerRestoreBlockReason,
} from "../src/lib/backupRestoreSourceErrors.mjs";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const restoreStart = source.indexOf("const restoreWorkspaceBackup = async (file: File) => {");
const restoreEnd = source.indexOf("const exportWorkspaceBackup = async () => {", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "workspace restore handler must exist");

const restoreHandler = source.slice(restoreStart, restoreEnd);
const guardCall = restoreHandler.indexOf("getCommunicationRecipientLedgerRestoreBlockReason(backup)");
const firstConfirmation = restoreHandler.indexOf("window.confirm");
const firstFrontendMutation = restoreHandler.indexOf('apply("condominiums"');
const firstLocalStorageWrite = restoreHandler.indexOf("localStorage.setItem");
assert.ok(guardCall >= 0, "restore must call the legacy recipient-ledger guard");
assert.ok(firstConfirmation > guardCall, "legacy backup guard must run before user confirmation");
assert.ok(firstFrontendMutation > guardCall, "legacy backup guard must run before React state mutation");
assert.ok(firstLocalStorageWrite > guardCall, "legacy backup guard must run before localStorage mutation");
assert.match(restoreHandler, /if \(recipientLedgerBlockReason\)\s*\{\s*alert\(recipientLedgerBlockReason\);\s*return;/);
assert.ok(packageJson.scripts.test.includes("test-backup-legacy-communication-ledger-guard.mjs"),
  "legacy recipient-ledger regression must be wired into npm test");

// Preserve PR #181 compatibility: absence of backendReadErrors alone is not an error.
assert.equal(formatBackupReadErrors(null), "");
assert.equal(formatBackupReadErrors({}), "");

const communicationId = "33333333-3333-4333-8333-333333333333";
const recipientId = "55555555-5555-4555-8555-555555555555";
const communication = {
  id: communicationId,
  email_status: "Inviata",
  email_prepared_at: "2026-11-24T12:00:00.000Z",
};
const recipient = {
  id: recipientId,
  communication_id: communicationId,
  status: "sent",
  provider_message_id: "re_accepted_123",
};

const legacyV1MissingLedger = {
  format: "BETHAG_WORKSPACE_BACKUP",
  version: 1,
  backend: { communications: [communication] },
  frontendState: { communications: [communication] },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(legacyV1MissingLedger),
  /Ripristino bloccato/i,
  "legacy v1 backup with communications but no recipient ledger must fail closed",
);

const missingLedgerWithOnlyLocalCommunications = {
  format: "BETHAG_WORKSPACE_BACKUP",
  version: 1,
  backend: {},
  frontendState: { communications: [communication] },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(missingLedgerWithOnlyLocalCommunications),
  /Ripristino bloccato/i,
  "frontend-only communication snapshots must not bypass the ledger guard",
);

const recipientReadFailure = {
  backend: { communications: [communication], communication_recipients: [] },
  backendReadErrors: { communication_recipients: "timeout while reading recipient page 2" },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(recipientReadFailure),
  /registro completo/i,
  "a recipient export read error must block communication restore",
);

const communicationReadFailure = {
  backend: { communication_recipients: [recipient] },
  frontendState: { communications: [communication] },
  backendReadErrors: { communications: "permission denied" },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(communicationReadFailure),
  /registro completo/i,
  "a communication export read error must block communication restore",
);

const completeBackup = {
  backend: {
    communications: [communication],
    communication_recipients: [recipient],
  },
  frontendState: { communications: [communication] },
  backendReadErrors: {},
};
assert.equal(getCommunicationRecipientLedgerRestoreBlockReason(completeBackup), "");

const completeBackupWithUnrelatedReadError = {
  ...completeBackup,
  backendReadErrors: { documents: "temporary read failure" },
};
assert.equal(
  getCommunicationRecipientLedgerRestoreBlockReason(completeBackupWithUnrelatedReadError),
  "",
  "unrelated source read errors remain handled by the existing partial-restore warning",
);

const sentCommunicationWithEmptyLedger = {
  backend: { communications: [communication], communication_recipients: [] },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(sentCommunicationWithEmptyLedger),
  /non ha destinatari/i,
  "a sent communication without any recipient row must fail closed even when the table key exists",
);

const preparedCommunicationWithEmptyLedger = {
  backend: {
    communications: [{ ...communication, email_status: "prepared", email_prepared_at: "2026-11-24T12:00:00.000Z" }],
    communication_recipients: [],
  },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(preparedCommunicationWithEmptyLedger),
  /non ha destinatari/i,
  "an in-progress email preparation without recipient rows must fail closed",
);

const noRecipientsCommunication = {
  backend: {
    communications: [{ id: communicationId, email_status: "no_recipients", email_prepared_at: null }],
    communication_recipients: [],
  },
};
assert.equal(
  getCommunicationRecipientLedgerRestoreBlockReason(noRecipientsCommunication),
  "",
  "a complete backup with an explicit no_recipients state and an empty recipient ledger is valid",
);

const legacyBackupWithoutCommunications = {
  format: "BETHAG_WORKSPACE_BACKUP",
  version: 1,
  backend: { condominiums: [] },
  frontendState: { communications: [] },
};
assert.equal(
  getCommunicationRecipientLedgerRestoreBlockReason(legacyBackupWithoutCommunications),
  "",
  "legacy backups with no communication data remain restorable",
);

const mismatchedFrontendSnapshot = {
  backend: { communications: [communication], communication_recipients: [recipient] },
  frontendState: { communications: [{ ...communication, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }] },
};
assert.match(
  getCommunicationRecipientLedgerRestoreBlockReason(mismatchedFrontendSnapshot),
  /snapshot locale/i,
  "frontend communication IDs not present in the backend snapshot must fail closed",
);

const missingLedgerPropertyWithNoCommunications = {
  backend: { communications: [] },
  frontendState: { communications: [] },
};
assert.equal(getCommunicationRecipientLedgerRestoreBlockReason(missingLedgerPropertyWithNoCommunications), "");

console.log("Legacy communication recipient-ledger restore guard runtime regression: PASS");
