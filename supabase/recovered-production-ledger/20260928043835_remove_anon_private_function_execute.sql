revoke execute on function private.can_access_condominium(uuid) from anon;
revoke execute on function private.can_access_resident_condominium(uuid) from anon;
revoke execute on function private.can_access_workspace_module(uuid, text) from anon;
revoke execute on function private.is_workspace_admin(uuid) from anon;
revoke execute on function private.is_workspace_member(uuid) from anon;