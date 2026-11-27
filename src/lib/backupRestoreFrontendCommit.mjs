/**
 * Returns export-time read failures only for tables that the restore handler
 * is allowed to restore. Authorization/workflow tables are intentionally
 * excluded by the caller because they are not restored from a user-supplied
 * backup.
 *
 * Missing metadata is accepted for legacy backups. A present but malformed
 * error section fails closed because its completeness cannot be established.
 */
export function getRestorableBackupSourceReadErrors(backendReadErrors, restorableTables) {
  if (!Array.isArray(restorableTables)) {
    throw new TypeError("restorableTables must be an array");
  }
  if (backendReadErrors === undefined || backendReadErrors === null) return [];
  if (
    typeof backendReadErrors !== "object" ||
    Array.isArray(backendReadErrors)
  ) {
    return ["backendReadErrors: formato non valido"];
  }

  const allowedTables = new Set(
    restorableTables.filter((table) => typeof table === "string" && table.trim())
  );
  return Object.entries(backendReadErrors)
    .filter(([table, message]) =>
      allowedTables.has(table) &&
      message !== undefined &&
      message !== null &&
      String(message).trim().length > 0
    )
    .map(([table, message]) => `${table}: ${String(message).trim()}`);
}

/**
 * Commits the backup's frontend/localStorage snapshot only after every
 * backend restore operation completed and every restorable source table was
 * exported without read errors.
 *
 * Supabase table writes are not one client-side transaction. If any write or
 * ownership check fails, backend rows may already have been partially
 * persisted; applying the full frontend snapshot would create a second,
 * misleading local representation. The same applies when the source backup
 * omitted one or more restorable tables during export.
 */
export function commitBackupFrontendStateAfterBackendRestore(
  backendErrors,
  commitFrontendState,
  sourceReadErrors = []
) {
  if (!Array.isArray(backendErrors)) {
    throw new TypeError("backendErrors must be an array");
  }
  if (typeof commitFrontendState !== "function") {
    throw new TypeError("commitFrontendState must be a function");
  }
  if (!Array.isArray(sourceReadErrors)) {
    throw new TypeError("sourceReadErrors must be an array");
  }

  if (backendErrors.length > 0 || sourceReadErrors.length > 0) {
    return {
      committed: false,
      failedOperations: backendErrors.length,
      failedSourceReads: sourceReadErrors.length,
      reason: sourceReadErrors.length > 0
        ? "source_backup_incomplete"
        : "backend_restore_incomplete",
    };
  }

  commitFrontendState();
  return {
    committed: true,
    failedOperations: 0,
    failedSourceReads: 0,
    reason: "backend_restore_complete",
  };
}
