/**
 * Returns an export-time warning when the backend snapshot cannot be read.
 * The backup may still contain useful local state, but it must not be reported
 * as a complete workspace backup without both a Supabase client and workspace.
 */
export function getBackupBackendExportAvailabilityError(hasSupabase, workspaceId) {
  if (!hasSupabase) {
    return "Supabase non configurato: nessuna tabella backend è stata esportata.";
  }
  if (typeof workspaceId !== "string" || !workspaceId.trim()) {
    return "Workspace attivo non disponibile: nessuna tabella backend è stata esportata.";
  }
  return "";
}
