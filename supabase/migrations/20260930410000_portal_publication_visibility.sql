-- Portal visibility: residents/council can only read assemblies explicitly published.
drop policy if exists "authorized users read assemblies" on public.assemblies;
create policy "authorized users read assemblies"
on public.assemblies for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'assemblee')
  or (
    data->>'publishedToPortal' = 'true'
    and (
      private.can_access_resident_condominium_module(condominium_id, 'assemblee')
      or private.can_access_resident_condominium_module(condominium_id, 'verbali')
    )
  )
);

-- Portal visibility: residents/council can only read communications explicitly published.
drop policy if exists "authorized users read communications" on public.communications;
create policy "authorized users read communications"
on public.communications for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'comunicazioni')
  or (
    published = true
    and private.can_access_resident_condominium_module(condominium_id, 'comunicazioni')
  )
);