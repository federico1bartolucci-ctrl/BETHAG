-- RECONSTRUCTED from the exact SQL statements retained in live Postgres logs
-- for the QA migration applied at 2026-11-04 12:28:33 UTC.
-- The original source file is unavailable; these are the logged statements.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
