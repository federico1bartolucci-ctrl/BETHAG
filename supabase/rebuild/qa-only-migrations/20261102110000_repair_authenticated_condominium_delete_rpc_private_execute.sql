-- QA-only repair: the public invoker RPC delegates to this private implementation.
-- The implementation is SECURITY DEFINER but enforces auth.uid() and the
-- condomini module permission before deleting any workspace data.
REVOKE EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) TO authenticated;
