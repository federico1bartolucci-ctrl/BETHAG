import { getUnconfirmedStorageRemovalPaths } from "./documentStorageUpload.js";

export async function collectCondominiumStoragePaths(fetchPage, pageSize = 1000) {
  if (typeof fetchPage !== "function") throw new TypeError("A document-page loader is required.");
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError("Page size must be a positive integer.");

  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    if (!Array.isArray(page)) throw new Error("Condominium document lookup returned a malformed page.");
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return Array.from(new Set(
    rows
      .map((row) => String(row?.file_path ?? "").trim())
      .filter(Boolean)
  ));
}

export async function deleteCondominiumWithStorageCleanup({
  deleteDatabase,
  storagePaths,
  removeBatch,
  batchSize = 1000,
}) {
  if (typeof deleteDatabase !== "function") throw new TypeError("A database deletion operation is required.");
  if (typeof removeBatch !== "function") throw new TypeError("A Storage cleanup operation is required.");
  if (!Array.isArray(storagePaths)) throw new TypeError("Storage paths must be an array.");
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new RangeError("Batch size must be a positive integer.");

  // The database RPC is authoritative. Never remove files if it fails.
  await deleteDatabase();

  const paths = Array.from(new Set(
    storagePaths.map((path) => String(path ?? "").trim()).filter(Boolean)
  ));
  const failedStoragePaths = [];
  const storageErrors = [];

  for (let offset = 0; offset < paths.length; offset += batchSize) {
    const batch = paths.slice(offset, offset + batchSize);
    try {
      const result = await removeBatch(batch);
      if (result?.error) throw result.error;
      const unconfirmedPaths = getUnconfirmedStorageRemovalPaths(result?.data, batch);
      if (unconfirmedPaths.length) {
        failedStoragePaths.push(...unconfirmedPaths);
        storageErrors.push({
          message: "Storage cleanup did not confirm removal of every requested path.",
        });
      }
    } catch (error) {
      failedStoragePaths.push(...batch);
      storageErrors.push({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    databaseDeleted: true,
    storageDeleted: failedStoragePaths.length === 0,
    failedStoragePaths,
    storageErrors,
  };
}
