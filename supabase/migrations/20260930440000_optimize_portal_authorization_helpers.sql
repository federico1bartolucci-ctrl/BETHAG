-- Performance-only optimization for portal authorization helpers.
-- The authorization rules are unchanged; auth context is evaluated once
-- per statement instead of once per candidate row.

create or replace function private.can_access_workspace_module(target_workspace uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
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
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$;

create or replace function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;
