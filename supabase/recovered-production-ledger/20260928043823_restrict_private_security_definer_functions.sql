revoke execute on function private.can_access_condominium(uuid) from public;
revoke execute on function private.can_access_resident_condominium(uuid) from public;
revoke execute on function private.can_access_workspace_module(uuid, text) from public;
revoke execute on function private.is_workspace_admin(uuid) from public;
revoke execute on function private.is_workspace_member(uuid) from public;

grant execute on function private.can_access_condominium(uuid) to authenticated;
grant execute on function private.can_access_resident_condominium(uuid) to authenticated;
grant execute on function private.can_access_workspace_module(uuid, text) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;