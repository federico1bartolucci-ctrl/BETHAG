-- RLS policies execute these private SECURITY DEFINER helpers on behalf of authenticated users.
-- Keep them unreachable to anon while allowing the authenticated role to evaluate
-- the policies that reference them.
grant execute on function private.can_access_condominium(uuid) to authenticated;
grant execute on function private.can_access_resident_condominium(uuid) to authenticated;
grant execute on function private.can_access_resident_condominium_module(uuid, text) to authenticated;
grant execute on function private.can_access_workspace_module(uuid, text) to authenticated;
grant execute on function private.can_manage_workspace_module(uuid, text) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;

revoke execute on function private.can_access_condominium(uuid) from anon;
revoke execute on function private.can_access_resident_condominium(uuid) from anon;
revoke execute on function private.can_access_resident_condominium_module(uuid, text) from anon;
revoke execute on function private.can_access_workspace_module(uuid, text) from anon;
revoke execute on function private.can_manage_workspace_module(uuid, text) from anon;
revoke execute on function private.is_workspace_admin(uuid) from anon;
revoke execute on function private.is_workspace_member(uuid) from anon;
