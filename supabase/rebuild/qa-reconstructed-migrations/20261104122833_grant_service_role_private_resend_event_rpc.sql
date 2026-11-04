-- RECONSTRUCTED from live QA function signature and ACL on 2026-11-04.
-- This is not the original historical payload.
REVOKE EXECUTE ON FUNCTION private.apply_resend_communication_event(text, text, text, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.apply_resend_communication_event(text, text, text, text, timestamp with time zone) TO service_role;
