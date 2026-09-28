-- Align resident/council access with the real Portal registry.
create or replace function private.can_access_resident_condominium(target_condominium uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and lower(cm.email) = lower(pa.email)
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  );
$function$;

create or replace function private.can_access_condominium(target_condominium uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.condominiums c
    where c.id = target_condominium
      and (
        private.is_workspace_admin(c.workspace_id)
        or private.can_access_workspace_module(c.workspace_id, 'condomini')
        or private.can_access_resident_condominium(c.id)
      )
  );
$function$;

revoke all on function private.can_access_resident_condominium(uuid) from public, anon;
grant execute on function private.can_access_resident_condominium(uuid) to authenticated;
revoke all on function private.can_access_condominium(uuid) from public, anon;
grant execute on function private.can_access_condominium(uuid) to authenticated;