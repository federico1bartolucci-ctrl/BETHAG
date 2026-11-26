/**
 * Formats export-time read failures recorded in a BETHAG workspace backup.
 * Empty or malformed entries are ignored so legacy backups remain restorable.
 */
export function formatBackupReadErrors(errors) {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return "";
  return Object.entries(errors)
    .filter(([table, message]) => typeof table === "string" && table.trim() && message != null && String(message).trim())
    .map(([table, message]) => `${table}: ${String(message).trim()}`)
    .join(" | ");
}
