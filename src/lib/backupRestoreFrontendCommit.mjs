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

  const frontendResult = commitFrontendState();
  const failedLocalStorageWrites = Number.isFinite(frontendResult?.failedLocalStorageWrites)
    ? Math.max(0, Math.trunc(frontendResult.failedLocalStorageWrites))
    : 0;
  const rollbackFailed = Number.isFinite(frontendResult?.rollbackFailed)
    ? Math.max(0, Math.trunc(frontendResult.rollbackFailed))
    : 0;

  if (failedLocalStorageWrites > 0 || rollbackFailed > 0) {
    return {
      committed: false,
      failedOperations: 0,
      failedSourceReads: 0,
      failedLocalStorageWrites,
      rollbackFailed,
      reason: "frontend_local_storage_incomplete",
    };
  }

  return {
    committed: true,
    failedOperations: 0,
    failedSourceReads: 0,
    reason: "backend_restore_complete",
  };
}
