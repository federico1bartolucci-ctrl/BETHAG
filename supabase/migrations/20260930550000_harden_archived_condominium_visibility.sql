-- Prevent archived condominiums from remaining visible through resident/council portal access.
-- Archive state is stored in condominiums.data.archivedAt by the current application model.

create or replace function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.condominiums c
    join public.portal_access pa on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and ((pa.user_id is not null and cm.user_id = pa.user_id) or lower(cm.email) = lower(pa.email))
    where c.id = target_condominium
      and coalesce(c.data->>'archivedAt', '') = ''
      and pa.active = true
      and pa.role in ('resident','council')
      and (pa.user_id = (select auth.uid()) or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;

drop policy if exists "residents read own portal access" on public.portal_access;
create policy "residents read own portal access" on public.portal_access
for select to authenticated
using (
  active = true
  and exists (select 1 from public.condominiums c where c.id = portal_access.condominium_id and coalesce(c.data->>'archivedAt', '') = '')
  and (user_id = (select auth.uid()) or (user_id is null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))))
);

drop policy if exists "Authorized condominium managers can read units" on public.condominium_units;
create policy "Authorized condominium managers can read units" on public.condominium_units
for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'condomini')
  or (
    exists (select 1 from public.condominiums c where c.id = condominium_units.condominium_id and coalesce(c.data->>'archivedAt', '') = '')
    and exists (
      select 1
      from public.portal_access pa
      join public.condominium_members cm
        on cm.condominium_id = pa.condominium_id and cm.unit_id = condominium_units.id and cm.active = true
       and ((pa.user_id is not null and cm.user_id = (select auth.uid())) or lower(cm.email) = lower(pa.email))
      where pa.condominium_id = condominium_units.condominium_id
        and pa.active = true and pa.role in ('resident','council')
        and (pa.user_id = (select auth.uid()) or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
    )
  )
);

drop policy if exists "authorized users read condominium members" on public.condominium_members;
create policy "authorized users read condominium members" on public.condominium_members
for select to authenticated
using (
  (select private.can_access_workspace_module((select c.workspace_id from public.condominiums c where c.id = condominium_members.condominium_id), 'condomini'))
  or (
    user_id = (select auth.uid())
    and exists (select 1 from public.condominiums c where c.id = condominium_members.condominium_id and coalesce(c.data->>'archivedAt', '') = '')
  )
  or (
    user_id is null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and active = true
    and exists (select 1 from public.condominiums c where c.id = condominium_members.condominium_id and coalesce(c.data->>'archivedAt', '') = '')
  )
);
