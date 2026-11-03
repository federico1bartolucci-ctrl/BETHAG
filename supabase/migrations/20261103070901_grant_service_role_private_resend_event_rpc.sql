GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;