drop policy if exists "authorized users read condominiums" on public.condominiums;
create policy "authorized users read condominiums"
on public.condominiums
for select
to authenticated
using (
  private.is_workspace_member(workspace_id)
  or private.can_access_condominium(id)
);