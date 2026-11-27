import assert from "node:assert/strict";
import {
  DocumentPersistenceUncertainError,
  persistDocumentRecordWithVerification,
  saveDocumentWithStorage,
} from "../src/lib/documentSaveFlow.mjs";

const documentRow = {
  workspace_id: "workspace-1",
  legacy_id: 42,
  condominium_id: "condominium-1",
  title: "Verbale assemblea",
  category: "Verbali",
  status: "Privato",
  file_path: "workspace-1/condominium-1/new.pdf",
  data: { name: "Verbale assemblea", metadata: { z: 2, a: 1 }, storagePath: "workspace-1/condominium-1/new.pdf" },
};
const readback = () => ({
  ...documentRow,
  data: { storagePath: documentRow.file_path, metadata: { a: 1, z: 2 }, name: documentRow.title },
});

{
  const result = await persistDocumentRecordWithVerification({
    document: documentRow,
    write: async () => {},
    read: async () => readback(),
  });
  assert.equal(result.file_path, documentRow.file_path);
}

{
  const result = await persistDocumentRecordWithVerification({
    document: documentRow,
    write: async () => { throw new Error("response lost after commit"); },
    read: async () => readback(),
  });
  assert.equal(result.file_path, documentRow.file_path, "read-back confirms a committed write after a lost response");
}

{
  const writeError = new Error("permission denied");
  await assert.rejects(
    persistDocumentRecordWithVerification({
      document: documentRow,
      write: async () => { throw writeError; },
      read: async () => ({ ...readback(), file_path: "old.pdf" }),
    }),
    (error) => error === writeError,
  );
}

{
  await assert.rejects(
    persistDocumentRecordWithVerification({
      document: documentRow,
      write: async () => {},
      read: async () => { throw new Error("read-back unavailable"); },
    }),
    (error) => error instanceof DocumentPersistenceUncertainError && error.persistenceUncertain === true,
  );
}

{
  await assert.rejects(
    persistDocumentRecordWithVerification({
      document: documentRow,
      write: async () => {},
      read: async () => ({ ...readback(), title: "different" }),
    }),
    (error) => error instanceof DocumentPersistenceUncertainError && error.persistenceUncertain === true,
  );
}

const baseDocument = { id: 42, condominiumId: 10, name: "Verbale assemblea", category: "Verbali", publication: "Privato" };
const file = { name: "verbale.pdf", size: 123, type: "application/pdf" };

{
  const events = [];
  await assert.rejects(
    saveDocumentWithStorage({
      document: baseDocument,
      file,
      uploadFiles: async () => { events.push("upload"); return [{ path: "new.pdf" }]; },
      persistDocument: async () => { events.push("persist"); throw new Error("permission denied"); },
      deleteStoredFile: async (path) => { events.push("delete:" + path); },
    }),
    /permission denied/,
  );
  assert.deepEqual(events, ["upload", "persist", "delete:new.pdf"]);
}

{
  const events = [];
  const uncertain = new Error("read-back unavailable");
  uncertain.persistenceUncertain = true;
  await assert.rejects(
    saveDocumentWithStorage({
      document: baseDocument,
      previousDocument: { ...baseDocument, storagePath: "old.pdf" },
      file,
      uploadFiles: async () => { events.push("upload"); return [{ path: "new.pdf" }]; },
      persistDocument: async () => { events.push("persist"); throw uncertain; },
      deleteStoredFile: async (path) => { events.push("delete:" + path); },
    }),
    (error) => error.message.includes("new.pdf"),
  );
  assert.deepEqual(events, ["upload", "persist"], "uncertain persistence retains new and old objects");
}

{
  const events = [];
  const result = await saveDocumentWithStorage({
    document: baseDocument,
    previousDocument: { ...baseDocument, storagePath: "old.pdf" },
    file,
    uploadFiles: async () => { events.push("upload"); return [{ path: "new.pdf" }]; },
    persistDocument: async (item) => { events.push("persist"); assert.equal(item.storagePath, "new.pdf"); },
    deleteStoredFile: async (path) => { events.push("delete:" + path); },
  });
  assert.deepEqual(events, ["upload", "persist", "delete:old.pdf"]);
  assert.equal(result.document.storagePath, "new.pdf");
  assert.equal(result.cleanupWarning, null);
}

{
  const events = [];
  const result = await saveDocumentWithStorage({
    document: baseDocument,
    previousDocument: { ...baseDocument, storagePath: "old.pdf" },
    file,
    uploadFiles: async () => { events.push("upload"); return [{ path: "new.pdf" }]; },
    persistDocument: async () => { events.push("persist"); },
    deleteStoredFile: async (path) => { events.push("delete:" + path); throw new Error("Storage unavailable"); },
  });
  assert.deepEqual(events, ["upload", "persist", "delete:old.pdf"]);
  assert.ok(result.cleanupWarning.includes("old.pdf"));
}

{
  const events = [];
  await assert.rejects(
    saveDocumentWithStorage({
      document: baseDocument,
      previousDocument: { ...baseDocument, storagePath: "old.pdf" },
      file,
      uploadFiles: async () => { events.push("upload"); return [{ path: "new.pdf" }]; },
      persistDocument: async () => { events.push("persist"); throw new Error("database rejected"); },
      deleteStoredFile: async (path) => { events.push("delete:" + path); },
    }),
    /database rejected/,
  );
  assert.deepEqual(events, ["upload", "persist", "delete:new.pdf"], "failed replacement preserves the old file");
}

{
  const events = [];
  const result = await saveDocumentWithStorage({
    document: { ...baseDocument, storagePath: "existing.pdf" },
    previousDocument: { ...baseDocument, storagePath: "existing.pdf" },
    persistDocument: async () => { events.push("persist"); },
    deleteStoredFile: async (path) => { events.push("delete:" + path); },
  });
  assert.deepEqual(events, ["persist"]);
  assert.equal(result.document.storagePath, "existing.pdf");
}

console.log("Document metadata persistence, ambiguous-write verification and Storage compensation regression checks passed");
