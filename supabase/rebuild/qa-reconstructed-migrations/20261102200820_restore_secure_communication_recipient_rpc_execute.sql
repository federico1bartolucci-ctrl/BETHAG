-- RECONSTRUCTED from live QA function definitions and ACLs on 2026-11-04.
-- This is not the original historical payload. Both public wrappers are
-- SECURITY INVOKER and delegate to guarded private implementations.
REVOKE EXECUTE ON FUNCTION public.prepare_communication_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reset_stale_communication_recipients(uuid, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_stale_communication_recipients(uuid, interval) TO authenticated, service_role;
