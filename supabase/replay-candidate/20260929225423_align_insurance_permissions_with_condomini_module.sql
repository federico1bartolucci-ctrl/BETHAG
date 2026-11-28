
drop policy if exists "insurance_manager_delete" on public.condominium_insurance_policies;
drop policy if exists "insurance_manager_insert" on public.condominium_insurance_policies;
drop policy if exists "insurance_manager_select" on public.condominium_insurance_policies;
drop policy if exists "insurance_manager_update" on public.condominium_insurance_policies;

drop policy if exists "authorized managers manage insurance policies" on public.condominium_insurance_policies;
create policy "authorized managers manage insurance policies"
on public.condominium_insurance_policies
for all to authenticated
using ((select private.can_manage_workspace_module(workspace_id, 'condomini'::text)))
with check ((select private.can_manage_workspace_module(workspace_id, 'condomini'::text)));

drop policy if exists "authorized users read insurance policies" on public.condominium_insurance_policies;
create policy "authorized users read insurance policies"
on public.condominium_insurance_policies
for select to authenticated
using (
  (select private.can_access_workspace_module(workspace_id, 'condomini'::text))
  or exists (
    select 1
    from public.portal_access pa
    where pa.workspace_id = condominium_insurance_policies.workspace_id
      and pa.condominium_id = condominium_insurance_policies.condominium_id
      and pa.active = true
      and pa.role = any (array['resident'::text,'council'::text])
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'::text), ''))
      )
  )
);
