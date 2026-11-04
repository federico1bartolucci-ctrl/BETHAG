-- QA-only repair: authenticated invoker wrappers delegate to these guarded
-- SECURITY DEFINER implementations, which independently validate auth.uid()
-- and the condomini module permission.
REVOKE EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) TO authenticated;
