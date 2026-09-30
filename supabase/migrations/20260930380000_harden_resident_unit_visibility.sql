alter policy "Authorized condominium managers can read units" on public.condominium_units using (
  private.can_access_workspace_module(condominium_units.workspace_id, 'condomini')
  or exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.unit_id = condominium_units.id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = condominium_units.condominium_id
      and pa.active = true
      and pa.role in ('resident','council')
      and (pa.user_id = auth.uid() or lower(pa.email) = lower(coalesce(auth.jwt()->>'email','')))
  )
);