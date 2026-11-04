-- RECONSTRUCTED from the exact SQL statement retained in live Postgres logs
-- for the QA migration applied at 2026-11-04 12:56:14 UTC.
-- The original source file is unavailable; this is the logged statement.
REVOKE EXECUTE ON FUNCTION private.is_workspace_staff(uuid) FROM authenticated;
