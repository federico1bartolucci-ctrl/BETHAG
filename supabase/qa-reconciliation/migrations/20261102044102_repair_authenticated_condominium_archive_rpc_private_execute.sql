-- QA-only repair: public archive/restore wrappers are SECURITY INVOKER.
-- Their private SECURITY DEFINER implementations enforce auth.uid() and the
-- condomini module permission before changing archive metadata and audit rows.
REVOKE EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) TO authenticated;

