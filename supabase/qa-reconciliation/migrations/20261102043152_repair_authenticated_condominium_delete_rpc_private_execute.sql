REVOKE EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) TO authenticated;
