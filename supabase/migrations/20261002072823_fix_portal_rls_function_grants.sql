-- Ensure policy helper functions are callable by authenticated sessions, never anon.
revoke execute on function private.can_access_resident_condominium(uuid) from public, anon;
revoke execute on function private.can_access_resident_condominium_module(uuid,text) from public, anon;
revoke execute on function private.can_manage_workspace_module(uuid,text) from public, anon;
grant execute on function private.can_access_resident_condominium(uuid) to authenticated;
grant execute on function private.can_access_resident_condominium_module(uuid,text) to authenticated;
grant execute on function private.can_manage_workspace_module(uuid,text) to authenticated;
