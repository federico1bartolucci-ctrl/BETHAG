
drop policy if exists "Managers can delete condominium units" on public.condominium_units;
drop policy if exists "Managers can insert condominium units" on public.condominium_units;
drop policy if exists "Managers can read condominium units" on public.condominium_units;
drop policy if exists "Managers can update condominium units" on public.condominium_units;

create policy "Authorized condominium managers can insert units"
on public.condominium_units
for insert to authenticated
with check ((select private.can_manage_workspace_module(workspace_id, 'condomini'::text)));

create policy "Authorized condominium managers can read units"
on public.condominium_units
for select to authenticated
using ((select private.can_access_workspace_module(workspace_id, 'condomini'::text)));

create policy "Authorized condominium managers can update units"
on public.condominium_units
for update to authenticated
using ((select private.can_manage_workspace_module(workspace_id, 'condomini'::text)))
with check ((select private.can_manage_workspace_module(workspace_id, 'condomini'::text)));

drop policy if exists "authorized users read condominiums" on public.condominiums;
create policy "workspace members can read condominiums"
on public.condominiums
for select to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = condominiums.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.active = true
  )
  or private.can_access_resident_condominium(id)
);
