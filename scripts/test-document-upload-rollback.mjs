import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { uploadFilesWithRollback } from "../src/lib/documentStorageUpload.js";

function createMockStorage({
  failAt = 0,
  throwAt = 0,
  removeError = null,
  malformedUploadAt = 0,
  mismatchedUploadAt = 0,
  malformedRemove = false,
  partialRemove = false,
} = {}) {
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
          if (uploadCount === malformedUploadAt) return { data: null, error: null };
          if (uploadCount === mismatchedUploadAt) return { data: { path: "unexpected/" + path }, error: null };
          return { data: { path }, error: null };
        },
        async remove(paths) {
          calls.removals.push({ bucket, paths: [...paths] });
          if (removeError) return { data: null, error: removeError };
          if (malformedRemove) return { data: null, error: null };
          if (partialRemove) return { data: paths.slice(0, -1).map((name) => ({ name })), error: null };
          return { data: paths.map((name) => ({ name })), error: null };
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

// If cleanup returns an explicit error, the error includes the potentially orphaned path.
{
  const { storage, calls } = createMockStorage({ failAt: 2, removeError: new Error("storage delete denied") });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
}

// A thrown transport error is ambiguous: Storage may have committed the attempted file before the response was lost.
{
  const { storage, calls } = createMockStorage({ throwAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /network failure 2/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
}

// A success-shaped but empty upload response must not be accepted as a confirmed upload.
{
  const { storage, calls } = createMockStorage({ malformedUploadAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Risposta Storage non valida/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
}

// A response naming a different object path is not accepted; only the requested path is compensated.
{
  const { storage, calls } = createMockStorage({ mismatchedUploadAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Risposta Storage non valida/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
}

// A success-shaped but empty remove response is not proof that rollback completed.
{
  const { storage, calls } = createMockStorage({ failAt: 2, malformedRemove: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
}

// Partial remove responses report only the paths whose deletion was not confirmed.
{
  const { storage, calls } = createMockStorage({ failAt: 2, partialRemove: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
}

// Storage remove accepts up to 1,000 paths per request; rollback batches larger upload sets.
{
  const largeFiles = Array.from({ length: 1002 }, (_, index) => ({
    name: "file-" + index + ".pdf", type: "application/pdf", size: 1, lastModified: index,
  }));
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
  assert.match(backend, /import\s*\{\s*uploadFilesWithRollback\s*\}\s*from\s*["']\.\/documentStorageUpload\.js["']/);
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

console.log("PASS document upload rollback runtime: success metadata, explicit upload failures, ambiguous transport cleanup, malformed/mismatched upload responses, malformed/partial cleanup responses, 1,000-path batching, empty input, and production wiring.");
