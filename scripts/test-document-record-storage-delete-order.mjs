import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deleteDocumentRecordBeforeStorage } from "../src/lib/document-delete-sequence.mjs";

// Reproduce the old storage-first sequence: Storage succeeds, then DB delete fails,
// leaving a document row whose file has already been irreversibly removed.
const legacyEvents = [];
const legacyDbError = new Error("database delete failed");
await assert.rejects(async () => {
  await (async () => {
    legacyEvents.push("storage");
    await Promise.resolve();
    legacyEvents.push("database");
    throw legacyDbError;
  })();
}, legacyDbError);
assert.deepEqual(legacyEvents, ["storage", "database"], "Pre-fix order must reproduce missing-file/visible-record risk.");

const databaseFailureEvents = [];
const databaseError = new Error("database delete failed");
await assert.rejects(
  () => deleteDocumentRecordBeforeStorage({
    deleteRecord: async () => { databaseFailureEvents.push("database"); throw databaseError; },
    deleteStoredFile: async path => { databaseFailureEvents.push("storage:" + path); },
    storagePath: "workspace/file.pdf",
  }),
  databaseError,
);
assert.deepEqual(databaseFailureEvents, ["database"], "Storage must remain untouched if DB deletion fails.");

const successEvents = [];
const success = await deleteDocumentRecordBeforeStorage({
  deleteRecord: async () => { successEvents.push("database"); },
  deleteStoredFile: async path => { successEvents.push("storage:" + path); },
  storagePath: "workspace/file.pdf",
});
assert.deepEqual(success, { recordDeleted: true, storageDeleted: true, storagePath: "workspace/file.pdf" });
assert.deepEqual(successEvents, ["database", "storage:workspace/file.pdf"], "DB deletion must precede storage cleanup.");

const storageError = new Error("storage remove failed");
const partialEvents = [];
const partial = await deleteDocumentRecordBeforeStorage({
  deleteRecord: async () => { partialEvents.push("database"); },
  deleteStoredFile: async path => { partialEvents.push("storage:" + path); throw storageError; },
  storagePath: "workspace/file.pdf",
});
assert.equal(partial.recordDeleted, true);
assert.equal(partial.storageDeleted, false);
assert.equal(partial.error, storageError);
assert.deepEqual(partialEvents, ["database", "storage:workspace/file.pdf"]);

const localOnlyEvents = [];
const localOnly = await deleteDocumentRecordBeforeStorage({
  deleteRecord: async () => { localOnlyEvents.push("record"); },
  deleteStoredFile: async path => { localOnlyEvents.push("storage:" + path); },
  storagePath: "",
});
assert.deepEqual(localOnly, { recordDeleted: true, storageDeleted: true, storagePath: null });
assert.deepEqual(localOnlyEvents, ["record"]);

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("const deleteDocument = async");
const end = source.indexOf("const toggleDocumentPublication", start);
assert.ok(start >= 0 && end > start, "Document delete handler must exist and remain delimited.");
const handler = source.slice(start, end);
assert.match(handler, /deleteDocumentRecordBeforeStorage/, "Handler must use the tested safe delete sequence.");
assert.match(handler, /deleteWorkspaceRecordBackend/, "Handler must delete the DB document record.");
assert.match(handler, /deleteWorkspaceStoredFile/, "Handler must clean up the stored file.");
assert.match(handler, /storageDeleted/, "Handler must surface partial Storage cleanup failure.");
assert.match(handler, /setDocuments/, "UI state must reflect successful DB deletion.");
assert.ok(packageJson.scripts.test.includes("test-document-record-storage-delete-order.mjs"), "Regression must be wired into npm test.");
console.log("Document record/Storage delete-order runtime regression: PASS");
