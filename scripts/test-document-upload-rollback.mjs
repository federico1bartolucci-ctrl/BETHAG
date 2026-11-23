import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { uploadFilesWithRollback } from "../src/lib/documentStorageUpload.js";

function createMockStorage({ failAt = 0, throwAt = 0, removeError = null } = {}) {
  const calls = { uploads: [], removals: [] };
  let uploadCount = 0;
  const storage = {
    from(bucket) {
      return {
        async upload(path, file, options) {
          uploadCount += 1;
          calls.uploads.push({ bucket, path, file, options });
          if (uploadCount === throwAt) throw new Error("network failure " + uploadCount);
          if (uploadCount === failAt) return { data: null, error: new Error("upload failure " + uploadCount) };
          return { data: { path }, error: null };
        },
        async remove(paths) {
          calls.removals.push({ bucket, paths: [...paths] });
          return { data: removeError ? null : paths.map((name) => ({ name })), error: removeError };
        },
      };
    },
  };
  return { storage, calls };
}

const files = [
  { name: "first.pdf", type: "application/pdf", size: 10, lastModified: 100 },
  { name: "second.bin", type: "", size: 20, lastModified: 200 },
];

// Successful uploads preserve metadata and do not run rollback.
{
  const { storage, calls } = createMockStorage();
  const result = await uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name);
  assert.equal(result.length, 2);
  assert.equal(result[0].path, "workspace/first.pdf");
  assert.equal(result[1].path, "workspace/second.bin");
  assert.equal(result[0].type, "application/pdf");
  assert.equal(result[1].type, "application/octet-stream");
  assert.equal(result[1].size, 20);
  assert.equal(calls.uploads.length, 2);
  assert.equal(calls.removals.length, 0);
  assert.equal(calls.uploads[0].options.upsert, false);
}

// A later upload error removes every earlier confirmed upload before propagating the original error.
{
  const { storage, calls } = createMockStorage({ failAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "condominium/" + file.name),
    /Impossibile memorizzare "second.bin": upload failure 2/
  );
  assert.deepEqual(calls.removals, [{ bucket: "bethag-documents", paths: ["condominium/first.pdf"] }]);
}

// If cleanup fails, the error includes the cleanup failure and the potentially orphaned path.
{
  const { storage, calls } = createMockStorage({ failAt: 2, removeError: new Error("storage delete denied") });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
}

// Thrown upload/transport errors also trigger compensating cleanup.
{
  const { storage, calls } = createMockStorage({ throwAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /network failure 2/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
}

// Storage remove accepts up to 1,000 paths per request; rollback batches larger upload sets.
{
  const largeFiles = Array.from({ length: 1002 }, (_, index) => ({ name: "file-" + index + ".pdf", type: "application/pdf", size: 1, lastModified: index }));
  const { storage, calls } = createMockStorage({ failAt: 1002 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", largeFiles, (file) => "workspace/" + file.name),
    /file-1001.pdf/
  );
  assert.deepEqual(calls.removals.map((item) => item.paths.length), [1000, 1]);
  assert.equal(calls.removals.flatMap((item) => item.paths).length, 1001);
}

// Empty input is a no-op.
{
  const { storage, calls } = createMockStorage();
  const result = await uploadFilesWithRollback(storage, "bethag-documents", [], () => "unused");
  assert.deepEqual(result, []);
  assert.equal(calls.uploads.length, 0);
  assert.equal(calls.removals.length, 0);
}

// Both production wrappers must use the tested rollback helper and retain their respective path scopes.
{
  const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
  assert.match(backend, /import\s*\{\s*uploadFilesWithRollback\s*\}\s*from\s*["']\.\/documentStorageUpload["']/);
  function extractFunction(name) {
    const start = backend.indexOf("async function " + name + "(");
    assert.notEqual(start, -1, "missing backend function " + name);
    const opening = backend.indexOf("{", start);
    let depth = 0;
    for (let i = opening; i < backend.length; i += 1) {
      if (backend[i] === "{") depth += 1;
      else if (backend[i] === "}") depth -= 1;
      if (depth === 0) return backend.slice(start, i + 1);
    }
    throw new Error("unclosed function " + name);
  }
  const workspaceUpload = extractFunction("storeWorkspaceDocuments");
  const condominiumUpload = extractFunction("storeCondominiumDocuments");
  assert.match(workspaceUpload, /uploadFilesWithRollback\(/);
  assert.match(workspaceUpload, /condominiumId\s*\?\s*workspaceId\s*\+\s*["']\/["']\s*\+\s*condominiumId\s*:\s*workspaceId/);
  assert.match(condominiumUpload, /uploadFilesWithRollback\(/);
  assert.match(condominiumUpload, /const pathPrefix = workspaceId/);
}

console.log("PASS document upload rollback runtime: successful metadata, partial-failure cleanup, cleanup error paths, thrown upload errors, 1000-path batching, empty input, and production wrapper wiring.");
