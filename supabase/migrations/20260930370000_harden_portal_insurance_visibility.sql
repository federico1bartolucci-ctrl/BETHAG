drop policy if exists "authorized users read insurance policies" on public.condominium_insurance_policies;
create policy "authorized users read insurance policies"
on public.condominium_insurance_policies for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'condomini')
  or private.can_access_resident_condominium_module(condominium_id, 'documenti')
);