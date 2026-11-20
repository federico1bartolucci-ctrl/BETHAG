-- QA-only least-privilege cleanup for trigger functions.
-- Trigger execution does not require callers to hold EXECUTE; only CREATE
-- TRIGGER does. Keep the owner/service_role grants while removing PUBLIC,
-- anon and authenticated direct invocation.
REVOKE EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() FROM PUBLIC, anon, authenticated;
