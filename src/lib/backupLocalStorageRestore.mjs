/**
 * Restores only recognized BETHAG local-storage keys from a workspace backup.
 * The backup is user-controlled input; arbitrary keys (including auth storage
 * keys) must never be written into the browser's local storage.
 *
 * When rollbackOnFailure is enabled, the restore is all-or-nothing for the
 * supplied keys: successful writes are reverted if a later key cannot be
 * written. This prevents a partial local snapshot from being mistaken for a
 * completed restore.
 */
export function restoreBackupLocalStorageData(data, allowedKeys, storage, options = {}) {
  const rollbackOnFailure = options?.rollbackOnFailure === true;
  const emptyResult = rollbackOnFailure
    ? { restored: 0, skipped: 0, failed: 0, rollbackFailed: 0, rolledBack: 0 }
    : { restored: 0, skipped: 0, failed: 0 };
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return emptyResult;
  }

  const allowed = new Set(
    Array.isArray(allowedKeys) ? allowedKeys.filter((key) => typeof key === "string") : []
  );
  const entries = Object.entries(data);
  const snapshots = [];
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const [storageKey, value] = entries[index];
    if (!allowed.has(storageKey) || value === undefined) {
      skipped += 1;
      continue;
    }

    let serialized;
    try {
      serialized = typeof value === "string" ? value : JSON.stringify(value);
    } catch {
      failed += 1;
      if (rollbackOnFailure) {
        skipped += entries.length - index - 1;
        break;
      }
      continue;
    }
    if (serialized === undefined) {
      skipped += 1;
      continue;
    }

    let previousValue;
    if (rollbackOnFailure) {
      try {
        if (typeof storage?.getItem !== "function" || typeof storage?.removeItem !== "function") {
          throw new Error("Storage non supporta il rollback.");
        }
        previousValue = storage.getItem(storageKey);
      } catch {
        failed += 1;
        skipped += entries.length - index - 1;
        break;
      }
    }

    try {
      storage.setItem(storageKey, serialized);
      restored += 1;
      if (rollbackOnFailure) snapshots.push({ storageKey, previousValue });
    } catch {
      failed += 1;
      if (rollbackOnFailure) {
        skipped += entries.length - index - 1;
        break;
      }
    }
  }

  if (rollbackOnFailure && failed > 0) {
    let rollbackFailed = 0;
    for (const snapshot of [...snapshots].reverse()) {
      try {
        if (snapshot.previousValue === null || snapshot.previousValue === undefined) {
          storage.removeItem(snapshot.storageKey);
        } else {
          storage.setItem(snapshot.storageKey, snapshot.previousValue);
        }
      } catch {
        rollbackFailed += 1;
      }
    }
    return {
      restored: 0,
      skipped,
      failed,
      rollbackFailed,
      rolledBack: snapshots.length - rollbackFailed,
    };
  }

  return rollbackOnFailure
    ? { restored, skipped, failed, rollbackFailed: 0, rolledBack: 0 }
    : { restored, skipped, failed };
}
