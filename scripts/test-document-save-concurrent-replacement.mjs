import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DocumentEditConflictError,
  updateDocumentRecordIfStorageVersionMatches,
} from "../src/lib/documentRecordCompareAndSwap.mjs";
import { saveDocumentWithStorage } from "../src/lib/documentSaveFlow.mjs";

const initialRow = {
  id: "document-db-1",
  workspace_id: "workspace-1",
  legacy_id: 42,
  condominium_id: "condominium-db-1",
  title: "Verbale originale",
  category: "Verbali",
  status: "Privato",
  file_path: "workspace-1/10/old.pdf",
  data: {
    id: 42,
    condominiumId: 10,
    name: "Verbale originale",
    category: "Verbali",
    publication: "Privato",
    storagePath: "workspace-1/10/old.pdf",
  },
};

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableJson(value[key])])
    );
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

function createBarrier(expected) {
  let count = 0;
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return async () => {
    count += 1;
    if (count === expected) release();
    await promise;
  };
}

function createClient(initial = initialRow, options = {}) {
  const state = {
    row: clone(initial),
    waitForConcurrentReads: options.waitForConcurrentReads ? createBarrier(options.waitForConcurrentReads) : null,
  };

  function matches(row, filters) {
    if (!row) return false;
    return filters.every(({ kind, key, value }) => {
      if (kind === "is") return (row[key] ?? null) === value;
      const actual = key === "data->>storagePath" ? row.data?.storagePath ?? null : row[key];
      if (kind === "jsonEq") {
        let expected;
        try { expected = JSON.parse(value); } catch { return false; }
        return sameJson(actual, expected);
      }
      if (value && typeof value === "object") return sameJson(actual, value);
      return actual === value;
    });
  }

  const client = {
    from(table) {
      assert.equal(table, "documents");
      const query = {
        operation: "select",
        filters: [],
        payload: null,
        select() { return this; },
        update(payload) { this.operation = "update"; this.payload = payload; return this; },
        eq(key, value) { this.filters.push({ kind: "eq", key, value }); return this; },
        is(key, value) { this.filters.push({ kind: "is", key, value }); return this; },
        filter(key, operator, value) {
          assert.equal(operator, "eq");
          this.filters.push({ kind: key === "data" ? "jsonEq" : "eq", key, value });
          return this;
        },
        async maybeSingle() {
          if (this.operation === "select") {
            const snapshot = matches(state.row, this.filters) ? clone(state.row) : null;
            if (state.waitForConcurrentReads) await state.waitForConcurrentReads();
            return { data: snapshot, error: null };
          }
          if (!matches(state.row, this.filters)) return { data: null, error: null };
          state.row = { ...state.row, ...clone(this.payload) };
          return { data: clone(state.row), error: null };
        },
      };
      return query;
    },
  };
  return { client, state };
}

function rowWith(path, title, condominiumId = "condominium-db-1") {
  return {
    ...clone(initialRow),
    condominium_id: condominiumId,
    title,
    file_path: path,
    data: {
      ...clone(initialRow.data),
      condominiumId: condominiumId === "condominium-db-1" ? 10 : 20,
      name: title,
      storagePath: path,
    },
  };
}

// Reproduce the previous Storage-path-only compare-and-swap: two metadata-only
// editors retain the same path, so both stale updates pass and one edit is lost.
{
  const state = { row: clone(initialRow) };
  const barrier = createBarrier(2);
  async function legacyMetadataUpdate(nextRow) {
    const observed = clone(state.row);
    await barrier();
    assert.equal(observed.file_path, initialRow.file_path);
    state.row = { ...state.row, ...clone(nextRow) };
    return clone(state.row);
  }

  const results = await Promise.all([
    legacyMetadataUpdate(rowWith(initialRow.file_path, "Metadata edit A")),
    legacyMetadataUpdate(rowWith(initialRow.file_path, "Metadata edit B")),
  ]);
  assert.equal(results.length, 2, "the old Storage-only guard allowed both metadata writes");
  assert.equal(state.row.file_path, initialRow.file_path, "the Storage pointer does not change");
  assert.equal(state.row.title, "Metadata edit B", "the later stale write silently overwrites the first edit");
}

// Two independent sessions both read the old pointer. Only the first compare-and-swap may win.
{
  const { client, state } = createClient(initialRow, { waitForConcurrentReads: 2 });
  const replacementA = rowWith("workspace-1/10/a.pdf", "Replacement A");
  const replacementB = rowWith("workspace-1/10/b.pdf", "Replacement B");
  const results = await Promise.allSettled([
    updateDocumentRecordIfStorageVersionMatches(client, replacementA, {
      expectedCondominiumId: "condominium-db-1",
      expectedStoragePath: "workspace-1/10/old.pdf",
    }),
    updateDocumentRecordIfStorageVersionMatches(client, replacementB, {
      expectedCondominiumId: "condominium-db-1",
      expectedStoragePath: "workspace-1/10/old.pdf",
    }),
  ]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = results.find((item) => item.status === "rejected");
  assert.ok(rejected.reason instanceof DocumentEditConflictError);
  assert.ok(["workspace-1/10/a.pdf", "workspace-1/10/b.pdf"].includes(state.row.file_path));
}

// Metadata-only edits keep the same Storage path. The full-row CAS must still reject the stale writer.
{
  const { client, state } = createClient(initialRow, { waitForConcurrentReads: 2 });
  const metadataA = rowWith(initialRow.file_path, "Metadata edit A");
  const metadataB = rowWith(initialRow.file_path, "Metadata edit B");
  const results = await Promise.allSettled([
    updateDocumentRecordIfStorageVersionMatches(client, metadataA, {
      expectedCondominiumId: "condominium-db-1",
      expectedStoragePath: initialRow.file_path,
    }),
    updateDocumentRecordIfStorageVersionMatches(client, metadataB, {
      expectedCondominiumId: "condominium-db-1",
      expectedStoragePath: initialRow.file_path,
    }),
  ]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1,
    "only one concurrent metadata-only writer may commit");
  const rejected = results.find((item) => item.status === "rejected");
  assert.ok(rejected.reason instanceof DocumentEditConflictError,
    "the stale metadata-only writer must receive a document conflict");
  assert.equal(state.row.file_path, initialRow.file_path,
    "metadata conflict detection must not require a Storage-path change");
  assert.ok(["Metadata edit A", "Metadata edit B"].includes(state.row.title));
  assert.equal(state.row.data.name, state.row.title,
    "the winning top-level and JSONB metadata must remain aligned");
}

// Reproduce the dangerous order: a replacement commits, then an older metadata-only form tries to restore its stale path.
{
  const { client, state } = createClient(initialRow);
  await updateDocumentRecordIfStorageVersionMatches(
    client,
    rowWith("workspace-1/10/new.pdf", "Replacement"),
    { expectedCondominiumId: "condominium-db-1", expectedStoragePath: "workspace-1/10/old.pdf" },
  );

  await assert.rejects(
    updateDocumentRecordIfStorageVersionMatches(
      client,
      rowWith("workspace-1/10/old.pdf", "Stale metadata edit"),
      { expectedCondominiumId: "condominium-db-1", expectedStoragePath: "workspace-1/10/old.pdf" },
    ),
    (error) => error instanceof DocumentEditConflictError,
  );
  assert.equal(state.row.file_path, "workspace-1/10/new.pdf");
}

// A stale replacement must compensate its newly uploaded object and preserve the winning database pointer.
{
  const { client, state } = createClient(initialRow);
  await updateDocumentRecordIfStorageVersionMatches(
    client,
    rowWith("workspace-1/10/winner.pdf", "Winning replacement"),
    { expectedCondominiumId: "condominium-db-1", expectedStoragePath: "workspace-1/10/old.pdf" },
  );

  const removed = [];
  const staleDocument = {
    id: 42,
    condominiumId: 10,
    name: "Stale replacement",
    category: "Verbali",
    publication: "Privato",
    storagePath: "workspace-1/10/old.pdf",
  };
  await assert.rejects(
    saveDocumentWithStorage({
      document: staleDocument,
      previousDocument: { ...staleDocument },
      file: { name: "stale.pdf", size: 12, type: "application/pdf" },
      uploadFiles: async () => [{ path: "workspace-1/10/stale.pdf" }],
      persistDocument: (item, previous) => updateDocumentRecordIfStorageVersionMatches(
        client,
        rowWith(item.storagePath, item.name),
        {
          expectedCondominiumId: "condominium-db-1",
          expectedStoragePath: previous.storagePath,
        },
      ),
      deleteStoredFile: async (path) => { removed.push(path); },
    }),
    (error) => error instanceof DocumentEditConflictError,
  );
  assert.deepEqual(removed, ["workspace-1/10/stale.pdf"]);
  assert.equal(state.row.file_path, "workspace-1/10/winner.pdf");
}

// Legacy rows with file_path NULL but data.storagePath populated are still version-checked.
{
  const legacy = clone(initialRow);
  legacy.file_path = null;
  const { client, state } = createClient(legacy);
  await updateDocumentRecordIfStorageVersionMatches(
    client,
    rowWith("workspace-1/10/legacy-replacement.pdf", "Legacy replacement"),
    { expectedCondominiumId: "condominium-db-1", expectedStoragePath: "workspace-1/10/old.pdf" },
  );
  assert.equal(state.row.file_path, "workspace-1/10/legacy-replacement.pdf");
}

// Moving a document updates the old condominium row only if the observed storage version is still current.
{
  const { client, state } = createClient(initialRow);
  const moved = rowWith("workspace-1/20/moved.pdf", "Moved document", "condominium-db-2");
  await updateDocumentRecordIfStorageVersionMatches(
    client,
    moved,
    { expectedCondominiumId: "condominium-db-1", expectedStoragePath: "workspace-1/10/old.pdf" },
  );
  assert.equal(state.row.condominium_id, "condominium-db-2");
  assert.equal(state.row.file_path, "workspace-1/20/moved.pdf");
}

const [backend, main, flow, packageJson, casSource] = await Promise.all([
  readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/main.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/documentSaveFlow.mjs", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../src/lib/documentRecordCompareAndSwap.mjs", import.meta.url), "utf8"),
]);
assert.match(backend, /updateDocumentRecordIfStorageVersionMatches\(/);
assert.match(casSource, /\.filter\("data->>storagePath", "eq", legacyStoragePath\)/);
assert.match(casSource, /filterNullableColumn\(update, "title", current\.title\)/);
assert.match(casSource, /filterNullableColumn\(update, "category", current\.category\)/);
assert.match(casSource, /filterNullableColumn\(update, "status", current\.status\)/);
assert.match(casSource, /\.filter\("data", "eq", JSON\.stringify\(current\.data\)\)/);
assert.match(backend, /\.insert\(row\)/);
assert.match(main, /persistDocument: \(item, previousDocument\) => saveWorkspaceDocumentRecord\(profile\.workspaceId, item, previousDocument\)/);
assert.match(flow, /persistDocument\(nextDocument, previousDocument\)/);
assert.ok(packageJson.scripts.test.includes("test-document-save-concurrent-replacement.mjs"));

console.log("Document concurrent replacement and metadata-only concurrency regression: stale Storage pointer overwrite blocked; concurrent metadata lost-update reproduced and rejected; legacy file_path fallback guarded; stale uploaded object compensated; production wiring verified.");
