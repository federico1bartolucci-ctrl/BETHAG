-- Restore the workspace module-management authorization helper before later RLS migrations depend on it.
-- This helper is SECURITY DEFINER so RLS checks can be centralized consistently.

create or replace function private.can_manage_workspace_module(
  target_workspace uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '{}'::jsonb) ? required_permission
        )
      )
  );
$function$;

revoke all on function private.can_manage_workspace_module(uuid, text) from public;
revoke all on function private.can_manage_workspace_module(uuid, text) from anon;
grant execute on function private.can_manage_workspace_module(uuid, text) to authenticated;
