-- QA-only forward repair, applied to bethag-launch-qa on 2026-11-04.
-- Production already has the equivalent historical migration:
-- 20261103070901_grant_service_role_private_resend_event_rpc.sql
-- Keep this file outside supabase/migrations so it is not replayed on Production.

GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
