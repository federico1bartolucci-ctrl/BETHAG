drop policy if exists "authorized users read documents" on public.documents;
create policy "authorized users read documents"
on public.documents for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'documenti')
  or (
    private.can_access_resident_condominium_module(condominium_id, 'documenti')
    and coalesce(data->>'publication', '') = 'Condiviso'
  )
);