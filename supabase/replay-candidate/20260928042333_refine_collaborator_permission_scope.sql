drop policy if exists "members read condominiums" on public.condominiums;
create policy "members read condominiums"
on public.condominiums for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'condomini')
  or private.can_access_condominium(id)
);

drop policy if exists "authorized users read documents" on public.documents;
create policy "authorized users read documents"
on public.documents for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'documenti')
  or private.can_access_condominium(condominium_id)
);