import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  cleanupTemporaryStorageFiles,
  runWithTemporaryStorageCleanup,
} from "../src/lib/temporaryStorageCleanup.mjs";

{
  let calls = 0;
  const result = await cleanupTemporaryStorageFiles(["a.pdf", "a.pdf", "b.pdf"], async () => { calls += 1; });
  assert.equal(result.ok, true);
  assert.equal(calls, 2, "duplicate paths are removed once");
}

{
  let calls = 0;
  const result = await cleanupTemporaryStorageFiles(["temporary.pdf"], async () => {
    calls += 1;
    if (calls === 1) {
      const error = new Error("Storage unavailable");
      error.status = 503;
      throw error;
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.results[0].attempts, 2);
  assert.equal(calls, 2);
}

{
  let calls = 0;
  const result = await cleanupTemporaryStorageFiles(["temporary.pdf"], async () => {
    calls += 1;
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  });
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].path, "temporary.pdf");
  assert.equal(result.failures[0].attempts, 1, "permanent 4xx errors are not retried");
  assert.equal(calls, 1);
}

{
  let calls = 0;
  const result = await cleanupTemporaryStorageFiles(["temporary.pdf"], async () => {
    calls += 1;
    throw new Error("network failure");
  });
  assert.equal(result.ok, false);
  assert.equal(result.failures[0].attempts, 2, "transport failures are retried once");
  assert.equal(calls, 2);
}

{
  let analyzed = 0;
  let removed = 0;
  const result = await runWithTemporaryStorageCleanup({
    stored: [{ path: "temporary.pdf" }],
    analyze: async () => { analyzed += 1; return { draft: "ok" }; },
    removeFile: async () => { removed += 1; },
  });
  assert.deepEqual(result, { draft: "ok" });
  assert.equal(analyzed, 1);
  assert.equal(removed, 1);
}

{
  const result = await runWithTemporaryStorageCleanup({
    stored: [{ path: "temporary.pdf" }],
    analyze: async () => ({ draft: "ok" }),
    removeFile: async () => {
      const error = new Error("Storage unavailable");
      error.status = 503;
      throw error;
    },
  });
  assert.equal(result.draft, "ok", "successful AI result is preserved");
  assert.equal(result.cleanupWarnings.length, 1);
  assert.equal(result.cleanupWarnings[0].path, "temporary.pdf");
}

{
  const analysisError = new Error("AI request failed");
  await assert.rejects(
    runWithTemporaryStorageCleanup({
      stored: [{ path: "temporary.pdf" }],
      analyze: async () => { throw analysisError; },
      removeFile: async () => {},
    }),
    (error) => error === analysisError,
  );
}

{
  await assert.rejects(
    runWithTemporaryStorageCleanup({
      stored: [{ path: "temporary.pdf" }],
      analyze: async () => { throw new Error("AI request failed"); },
      removeFile: async () => {
        const error = new Error("Storage unavailable");
        error.status = 503;
        throw error;
      },
    }),
    (error) => error.message.includes("AI request failed") && error.message.includes("temporary.pdf"),
  );
}

{
  const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
  const main = await readFile("src/main.tsx", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.match(backend, /import \{ runWithTemporaryStorageCleanup \} from "\.\/temporaryStorageCleanup\.mjs"/);
  assert.match(backend, /export async function analyzeWorkspaceDocumentsWithAI[\s\S]*?return runWithTemporaryStorageCleanup/);
  assert.match(backend, /export async function analyzeCondominiumDocumentsWithAI[\s\S]*?return runWithTemporaryStorageCleanup/);
  assert.match(backend, /Number\(error\.status\) !== 404/);
  assert.match(main, /draft\?\.cleanupWarnings/);
  assert.match(main, /File temporaneo non rimosso/);
  assert.ok(packageJson.scripts.test.includes("test-temporary-storage-cleanup.mjs"));
}

console.log("Temporary Supabase Storage cleanup retry and reporting regression checks passed");
