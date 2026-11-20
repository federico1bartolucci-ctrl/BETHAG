drop policy if exists "authorized users read insurance policies" on public.condominium_insurance_policies;
create policy "authorized users read insurance policies" on public.condominium_insurance_policies for select to authenticated using (
  (select private.can_access_workspace_module(condominium_insurance_policies.workspace_id,'condomini'::text))
  or exists (
    select 1 from public.portal_access pa
    where pa.workspace_id=condominium_insurance_policies.workspace_id
      and pa.condominium_id=condominium_insurance_policies.condominium_id
      and pa.active=true and pa.role=any(array['resident'::text,'council'::text])
      and (pa.user_id=(select auth.uid()) or lower(pa.email)=lower(coalesce((select auth.jwt()->>'email'::text),'')))
  )
);