import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  collectCondominiumStoragePaths,
  deleteCondominiumWithStorageCleanup,
} from "../src/lib/condominiumStorageDeletion.mjs";

// Reproduce the previous false-failure path: the DB RPC commits, Storage fails,
// and the caller's catch incorrectly leaves the deleted condominium visible.
{
  const events = [];
  const ui = { condominiumVisible: true };
  const alerts = [];
  try {
    await (async () => {
      events.push("database-delete");
      const databaseDeleted = true;
      assert.equal(databaseDeleted, true);
      events.push("storage-remove");
      throw new Error("storage permission denied");
    })();
    ui.condominiumVisible = false;
  } catch {
    alerts.push("Il condominio non è stato cancellato dal server.");
  }
  assert.deepEqual(events, ["database-delete", "storage-remove"]);
  assert.equal(ui.condominiumVisible, true);
  assert.match(alerts[0], /non è stato cancellato/);
}
 
// Collect every document path over stable 1,000-row pages and deduplicate paths.
{
  const rows = Array.from({ length: 1001 }, (_, index) => ({ file_path: "workspace/condo/file-" + index + ".pdf" }));
  rows.push({ file_path: " workspace/condo/file-0.pdf " }, { file_path: null }, { file_path: "" });
  const requests = [];
  const paths = await collectCondominiumStoragePaths(async (offset, limit) => {
    requests.push({ offset, limit });
    return rows.slice(offset, offset + limit);
  });
  assert.deepEqual(requests, [{ offset: 0, limit: 1000 }, { offset: 1000, limit: 1000 }]);
  assert.equal(paths.length, 1001);
  assert.equal(paths[0], "workspace/condo/file-0.pdf");
  assert.equal(paths.at(-1), "workspace/condo/file-1000.pdf");
}

// A later-page read error must abort before the database RPC can delete anything.
{
  const events = [];
  await assert.rejects(
    () => collectCondominiumStoragePaths(async (offset) => {
      events.push("page:" + offset);
      if (offset === 1000) throw new Error("second page unavailable");
      return Array.from({ length: 1000 }, (_, index) => ({ file_path: "file-" + (offset + index) }));
    }),
    /second page unavailable/,
  );
  assert.deepEqual(events, ["page:0", "page:1000"]);
}

// Database failure must leave Storage untouched.
{
  const events = [];
  await assert.rejects(
    () => deleteCondominiumWithStorageCleanup({
      deleteDatabase: async () => { events.push("database"); throw new Error("RPC denied"); },
      storagePaths: ["workspace/a.pdf"],
      removeBatch: async () => { events.push("storage"); return { data: [], error: null }; },
    }),
    /RPC denied/,
  );
  assert.deepEqual(events, ["database"]);
}

// Storage cleanup is batched, failures are reported without disguising the committed DB deletion,
// and later batches are still attempted.
{
  const events = [];
  const paths = Array.from({ length: 1001 }, (_, index) => "workspace/file-" + index + ".pdf");
  const outcome = await deleteCondominiumWithStorageCleanup({
    deleteDatabase: async () => { events.push("database"); },
    storagePaths: paths,
    removeBatch: async (batch) => {
      events.push("storage:" + batch.length);
      if (batch[0] === "workspace/file-0.pdf") return { data: null, error: new Error("storage permission denied") };
      return { data: batch.map((name) => ({ name })), error: null };
    },
  });
  assert.equal(events[0], "database");
  assert.deepEqual(events.slice(1), ["storage:1000", "storage:1"]);
  assert.equal(outcome.databaseDeleted, true);
  assert.equal(outcome.storageDeleted, false);
  assert.equal(outcome.failedStoragePaths.length, 1000);
  assert.deepEqual(outcome.storageErrors, [{ message: "storage permission denied" }]);
}

// A malformed successful-looking Storage response is treated as incomplete cleanup.
{
  const outcome = await deleteCondominiumWithStorageCleanup({
    deleteDatabase: async () => {},
    storagePaths: ["workspace/a.pdf"],
    removeBatch: async () => ({ data: null, error: null }),
  });
  assert.equal(outcome.databaseDeleted, true);
  assert.equal(outcome.storageDeleted, false);
  assert.deepEqual(outcome.failedStoragePaths, ["workspace/a.pdf"]);
}

// An empty success-shaped response does not confirm deletion of a requested object.
{
  const outcome = await deleteCondominiumWithStorageCleanup({
    deleteDatabase: async () => {},
    storagePaths: ["workspace/a.pdf"],
    removeBatch: async () => ({ data: [], error: null }),
  });
  assert.equal(outcome.databaseDeleted, true);
  assert.equal(outcome.storageDeleted, false);
  assert.deepEqual(outcome.failedStoragePaths, ["workspace/a.pdf"]);
  assert.match(outcome.storageErrors[0].message, /did not confirm removal/i);
}

// A partial success-shaped response reports only the paths not confirmed by Storage.
{
  const outcome = await deleteCondominiumWithStorageCleanup({
    deleteDatabase: async () => {},
    storagePaths: ["workspace/a.pdf", "workspace/b.pdf", "workspace/c.pdf"],
    removeBatch: async () => ({
      data: [{ name: "workspace/a.pdf" }, { name: "workspace/c.pdf" }],
      error: null,
    }),
  });
  assert.equal(outcome.databaseDeleted, true);
  assert.equal(outcome.storageDeleted, false);
  assert.deepEqual(outcome.failedStoragePaths, ["workspace/b.pdf"]);
}

// A response containing an unrelated object path confirms none of the requested paths.
{
  const outcome = await deleteCondominiumWithStorageCleanup({
    deleteDatabase: async () => {},
    storagePaths: ["workspace/a.pdf", "workspace/b.pdf"],
    removeBatch: async () => ({ data: [{ name: "workspace/other.pdf" }], error: null }),
  });
  assert.equal(outcome.storageDeleted, false);
  assert.deepEqual(outcome.failedStoragePaths, ["workspace/a.pdf", "workspace/b.pdf"]);
}

// Empty paths are a successful no-op after the database transaction.
{
  const events = [];
  const outcome = await deleteCondominiumWithStorageCleanup({
    deleteDatabase: async () => { events.push("database"); },
    storagePaths: [],
    removeBatch: async () => { events.push("storage"); return { data: [], error: null }; },
  });
  assert.deepEqual(events, ["database"]);
  assert.deepEqual(outcome, {
    databaseDeleted: true,
    storageDeleted: true,
    failedStoragePaths: [],
    storageErrors: [],
  });
}

// Verify the production wiring and ensure the UI does not report a total deletion failure
// after the database RPC has committed.
{
  const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
  const deletion = await readFile(new URL("../src/lib/condominiumStorageDeletion.mjs", import.meta.url), "utf8");
  const upload = await readFile(new URL("../src/lib/documentStorageUpload.js", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const start = backend.indexOf("export async function deleteCondominium(");
  const end = backend.indexOf("export async function deleteCondominiumUnit(", start);
  assert.ok(start >= 0 && end > start, "Backend condominium delete function must exist.");
  const backendBody = backend.slice(start, end);
  assert.match(backend, /import\s*\{\s*collectCondominiumStoragePaths,\s*deleteCondominiumWithStorageCleanup\s*\}\s*from\s*["']\.\/condominiumStorageDeletion\.mjs["']/);
  assert.match(backendBody, /collectCondominiumStoragePaths/);
  assert.match(backendBody, /\.order\("id",\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.match(backendBody, /\.range\(offset,\s*offset\s*\+\s*pageSize\s*-\s*1\)/);
  assert.match(backendBody, /deleteCondominiumWithStorageCleanup/);
  assert.match(backendBody, /delete_condominium/);
  assert.match(upload, /export function getUnconfirmedStorageRemovalPaths/);
  assert.match(deletion, /import\\s*\\{\\s*getUnconfirmedStorageRemovalPaths\\s*\\}\\s*from\\s*["']\\.\\/documentStorageUpload\\.js["']/);
  assert.match(deletion, /getUnconfirmedStorageRemovalPaths\\(result\\?\\.data,\\s*batch\\)/);
  assert.match(main, /deletionOutcome\s*=\s*await deleteCondominiumBackend/);
  assert.match(main, /if\s*\(deletionOutcome\s*&&\s*!deletionOutcome\.storageDeleted\)/);
  assert.match(main, /setCondominiums\(\(current\)\s*=>\s*current\.filter/);
  assert.ok(packageJson.scripts.test.includes("test-condominium-storage-delete-outcome.mjs"));
}

console.log("Condominium storage deletion pagination and partial-outcome runtime regression: PASS");
