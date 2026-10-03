-- Restrict resident/council visibility of condominium member records to
-- their own linked record. Managers keep full condominium access.

drop policy if exists "authorized users read condominium members" on public.condominium_members;

create policy "authorized users read condominium members"
on public.condominium_members
for select
to authenticated
using (
  (
    select private.can_access_workspace_module(
      (
        select c.workspace_id
        from public.condominiums c
        where c.id = condominium_members.condominium_id
      ),
      'condomini'
    )
  )
  or user_id = (select auth.uid())
  or (
    user_id is null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and active = true
  )
);