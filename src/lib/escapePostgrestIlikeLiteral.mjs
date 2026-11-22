/**
 * Escapes user-supplied email text for a literal PostgREST ILIKE match.
 * PostgreSQL LIKE/ILIKE treat "_" and "%" as wildcards and "\" as escape.
 */
export function escapePostgrestIlikeLiteral(value) {
  return String(value ?? "").replace(/[\\%_]/g, "\\$&");
}
