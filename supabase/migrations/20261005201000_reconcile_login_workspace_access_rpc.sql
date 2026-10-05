create or replace function private.get_my_workspace_access()
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
    wm.workspace_id,
    wm.role,
    coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$$;

revoke all on function private.get_my_workspace_access() from public;
grant execute on function private.get_my_workspace_access() to authenticated;
