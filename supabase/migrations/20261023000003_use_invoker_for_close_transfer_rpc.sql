-- The public RPC is an invoker wrapper; privileged work remains in the
-- private SECURITY DEFINER implementation, which validates auth and workspace
-- permissions before touching any transfer data. This removes the exposed
-- SECURITY DEFINER entrypoint flagged by Supabase Security Advisor.
ALTER FUNCTION public.close_condominium_member_transfer(uuid) SECURITY INVOKER;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) FROM PUBLIC, anon;
