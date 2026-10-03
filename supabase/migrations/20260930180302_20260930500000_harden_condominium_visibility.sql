-- BETHAG security hardening
-- Residents/council users may read only condominiums they are actually linked to.
drop policy if exists "workspace members can read condominiums" on public.condominiums;

create policy "workspace members can read condominiums"
on public.condominiums
for select
to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'condomini')
  or private.can_access_resident_condominium(id)
);
