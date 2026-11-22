/**
 * Restores only recognized BETHAG local-storage keys from a workspace backup.
 * The backup is user-controlled input; arbitrary keys (including auth storage
 * keys) must never be written into the browser's local storage.
 */
export function restoreBackupLocalStorageData(data, allowedKeys, storage) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { restored: 0, skipped: 0, failed: 0 };
  }

  const allowed = new Set(
    Array.isArray(allowedKeys) ? allowedKeys.filter((key) => typeof key === "string") : []
  );
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const [storageKey, value] of Object.entries(data)) {
    if (!allowed.has(storageKey) || value === undefined) {
      skipped += 1;
      continue;
    }

    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      if (serialized === undefined) {
        skipped += 1;
        continue;
      }
      storage.setItem(storageKey, serialized);
      restored += 1;
    } catch {
      // A single local key must not abort the overall restore.
      failed += 1;
    }
  }

  return { restored, skipped, failed };
}
