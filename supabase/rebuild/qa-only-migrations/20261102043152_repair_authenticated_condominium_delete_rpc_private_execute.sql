-- QA-only forward migration recorded on the approved Supabase QA branch.
-- The public SECURITY INVOKER delete RPC delegates to this private implementation.
REVOKE EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) TO authenticated, service_role;
