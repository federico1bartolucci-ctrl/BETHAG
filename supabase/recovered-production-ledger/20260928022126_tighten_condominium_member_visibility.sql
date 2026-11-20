
drop policy if exists "members read condominium members" on public.condominium_members;

create policy "authorized users read condominium members" on public.condominium_members
for select using (
  exists (
    select 1
    from public.condominiums c
    where c.id = condominium_id
      and (
        private.is_workspace_staff(c.workspace_id)
        or user_id = (select auth.uid())
      )
  )
);
