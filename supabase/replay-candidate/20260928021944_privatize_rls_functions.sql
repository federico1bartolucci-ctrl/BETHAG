
create schema if not exists private;

alter function public.is_workspace_member(uuid) set schema private;
alter function public.is_workspace_admin(uuid) set schema private;
alter function public.is_workspace_staff(uuid) set schema private;
alter function public.can_access_condominium(uuid) set schema private;
alter function public.handle_new_user() set schema private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

revoke execute on function private.is_workspace_member(uuid) from public;
revoke execute on function private.is_workspace_admin(uuid) from public;
revoke execute on function private.is_workspace_staff(uuid) from public;
revoke execute on function private.can_access_condominium(uuid) from public;
revoke execute on function private.handle_new_user() from public;

grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.is_workspace_staff(uuid) to authenticated;
grant execute on function private.can_access_condominium(uuid) to authenticated;
