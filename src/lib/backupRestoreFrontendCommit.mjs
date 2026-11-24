/**
 * Commits the backup's frontend/localStorage snapshot only after every
 * backend restore operation has completed without errors.
 *
 * Supabase table writes are not one client-side transaction. If any write or
 * ownership check fails, backend rows may already have been partially
 * persisted; applying the full frontend snapshot would then create a second,
 * misleading local representation of data that was not restored.
 */
export function commitBackupFrontendStateAfterBackendRestore(backendErrors, commitFrontendState) {
  if (!Array.isArray(backendErrors)) {
    throw new TypeError("backendErrors must be an array");
  }
  if (typeof commitFrontendState !== "function") {
    throw new TypeError("commitFrontendState must be a function");
  }
  if (backendErrors.length > 0) {
    return {
      committed: false,
      failedOperations: backendErrors.length,
      reason: "backend_restore_incomplete",
    };
  }
  commitFrontendState();
  return {
    committed: true,
    failedOperations: 0,
    reason: "backend_restore_complete",
  };
}
