create or replace function public.get_my_workspace_access()
returns table(
  workspace_id uuid,
  role text,
  permissions jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    workspace_id,
    role,
    permissions
  from private.get_my_workspace_access()
$$;

revoke all on function public.get_my_workspace_access() from public;
revoke all on function public.get_my_workspace_access() from anon;
grant execute on function public.get_my_workspace_access() to authenticated;
