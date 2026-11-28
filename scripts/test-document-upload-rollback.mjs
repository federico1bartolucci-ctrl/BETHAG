import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { uploadFilesWithRollback } from "../src/lib/documentStorageUpload.js";

function createMockStorage({
  failAt = 0,
  failStatus = 409,
  failPersists = false,
  initialObjects = [],
  throwAt = 0,
  removeError = null,
  malformedUploadAt = 0,
  mismatchedUploadAt = 0,
  malformedRemove = false,
  partialRemove = false,
} = {}) {
  const calls = { uploads: [], removals: [] };
  const objects = new Set(initialObjects);
  let uploadCount = 0;
  const storage = {
    from(bucket) {
      return {
        async upload(path, file, options) {
          uploadCount += 1;
          calls.uploads.push({ bucket, path, file, options });
          if (uploadCount === throwAt) {
            objects.add(path); // Simulate server commit followed by a lost response.
            throw new Error("network failure " + uploadCount);
          }
          if (uploadCount === failAt) {
            if (failPersists) objects.add(path);
            const error = new Error(failStatus === null ? "fetch failed" : "upload failure " + uploadCount);
            if (failStatus === null) error.name = "StorageUnknownError";
            else error.status = failStatus;
            return { data: null, error };
          }
          if (uploadCount === malformedUploadAt) {
            objects.add(path); // The object exists although the response does not confirm it.
            return { data: null, error: null };
          }
          if (uploadCount === mismatchedUploadAt) {
            objects.add(path);
            return { data: { path: "unexpected/" + path }, error: null };
          }
          objects.add(path);
          return { data: { path }, error: null };
        },
        async remove(paths) {
          calls.removals.push({ bucket, paths: [...paths] });
          if (removeError) return { data: null, error: removeError };
          if (malformedRemove) return { data: null, error: null };
          const confirmed = partialRemove ? paths.slice(0, -1) : [...paths];
          confirmed.forEach((path) => objects.delete(path));
          return { data: confirmed.map((name) => ({ name })), error: null };
        },
      };
    },
  };
  return { storage, calls, objects };
}

// Reproduce the old production algorithm: the first object remains after a later upload fails.
async function legacySequentialUpload(storage, bucketName, inputFiles, createPath) {
  const stored = [];
  for (const file of inputFiles) {
    const path = createPath(file);
    const { error } = await storage.from(bucketName).upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });
    if (error) throw new Error("Impossibile memorizzare \"" + file.name + "\": " + error.message);
    stored.push({ name: file.name, path });
  }
  return stored;
}

const files = [
  { name: "first.pdf", type: "application/pdf", size: 10, lastModified: 100 },
  { name: "second.bin", type: "", size: 20, lastModified: 200 },
];

{
  const { storage, objects } = createMockStorage({ failAt: 2 });
  await assert.rejects(
    legacySequentialUpload(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Impossibile memorizzare "second.bin": upload failure 2/
  );
  assert.deepEqual([...objects], ["workspace/first.pdf"]);
}

// The replacement removes every confirmed earlier upload before propagating the failure.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Impossibile memorizzare "second.bin": upload failure 2/
  );
  assert.deepEqual(calls.removals, [{ bucket: "bethag-documents", paths: ["workspace/first.pdf"] }]);
  assert.equal(objects.size, 0);
}

// Supabase Storage SDK returns network failures as { data: null, error: StorageUnknownError },
// not as rejected promises. The request may have committed before the response was lost.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2, failStatus: null, failPersists: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /fetch failed/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
  assert.equal(objects.size, 0);
}

// HTTP 408 is a timeout response and must remain ambiguous even though it is a 4xx status.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2, failStatus: 408, failPersists: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /upload failure 2/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
  assert.equal(objects.size, 0);
}

// A 5xx response is ambiguous because the server may have stored the object before failing.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2, failStatus: 503, failPersists: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /upload failure 2/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
  assert.equal(objects.size, 0);
}

// A definitive 409 conflict must not delete a pre-existing object at the attempted path.
{
  const { storage, calls, objects } = createMockStorage({
    failAt: 2,
    failStatus: 409,
    initialObjects: ["workspace/second.bin"],
  });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /upload failure 2/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
  assert.deepEqual([...objects], ["workspace/second.bin"]);
}

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

// If cleanup returns an explicit error, the error includes the potentially orphaned path.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2, removeError: new Error("storage delete denied") });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
  assert.deepEqual([...objects], ["workspace/first.pdf"]);
}

// A thrown transport error is ambiguous: Storage may have committed the attempted file before the response was lost.
{
  const { storage, calls, objects } = createMockStorage({ throwAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /network failure 2/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
  assert.equal(objects.size, 0);
}

// An empty success-shaped upload response is not a confirmed upload; the attempted path is compensated.
{
  const { storage, calls, objects } = createMockStorage({ malformedUploadAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Risposta Storage non valida/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
  assert.equal(objects.size, 0);
}

// A response naming a different path is rejected and the requested path is compensated.
{
  const { storage, calls, objects } = createMockStorage({ mismatchedUploadAt: 2 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Risposta Storage non valida/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf", "workspace/second.bin"]);
  assert.equal(objects.size, 0);
}

// A malformed success-shaped remove response is not proof that rollback completed.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2, malformedRemove: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
  assert.deepEqual([...objects], ["workspace/first.pdf"]);
}

// Partial remove responses report only paths whose deletion was not confirmed.
{
  const { storage, calls, objects } = createMockStorage({ failAt: 2, partialRemove: true });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", files, (file) => "workspace/" + file.name),
    /Rollback Storage incompleto.*workspace\/first.pdf/
  );
  assert.deepEqual(calls.removals[0].paths, ["workspace/first.pdf"]);
  assert.deepEqual([...objects], ["workspace/first.pdf"]);
}

// Storage remove accepts up to 1,000 paths per request; rollback batches larger upload sets.
{
  const largeFiles = Array.from({ length: 1002 }, (_, index) => ({
    name: "file-" + index + ".pdf", type: "application/pdf", size: 1, lastModified: index,
  }));
  const { storage, calls, objects } = createMockStorage({ failAt: 1002 });
  await assert.rejects(
    uploadFilesWithRollback(storage, "bethag-documents", largeFiles, (file) => "workspace/" + file.name),
    /file-1001.pdf/
  );
  assert.deepEqual(calls.removals.map((item) => item.paths.length), [1000, 1]);
  assert.equal(calls.removals.flatMap((item) => item.paths).length, 1001);
  assert.equal(objects.size, 0);
}

// Empty input is a no-op.
{
  const { storage, calls } = createMockStorage();
  const result = await uploadFilesWithRollback(storage, "bethag-documents", [], () => "unused");
  assert.deepEqual(result, []);
  assert.equal(calls.uploads.length, 0);
  assert.equal(calls.removals.length, 0);
}

// Both production wrappers must use the tested rollback helper and retain their path scopes.
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

console.log("PASS document upload rollback runtime: legacy orphan reproduced; confirmed uploads rolled back; malformed upload/removal responses fail closed; ambiguous transport cleanup; 1,000-path batching; production wiring.");
