create or replace function private.can_access_resident_condominium_module(
  target_condominium uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.portal_access pa
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role = 'resident'
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;

revoke all on function private.can_access_resident_condominium_module(uuid, text) from public;
grant execute on function private.can_access_resident_condominium_module(uuid, text) to authenticated;

drop policy if exists "authorized users read documents" on public.documents;
create policy "authorized users read documents" on public.documents
for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'documenti')
  or private.can_access_resident_condominium_module(condominium_id, 'documenti')
);

drop policy if exists "authorized users read assemblies" on public.assemblies;
create policy "authorized users read assemblies" on public.assemblies
for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'assemblee')
  or private.can_access_resident_condominium_module(condominium_id, 'assemblee')
  or private.can_access_resident_condominium_module(condominium_id, 'verbali')
);

drop policy if exists "authorized users read communications" on public.communications;
create policy "authorized users read communications" on public.communications
for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'comunicazioni')
  or private.can_access_resident_condominium_module(condominium_id, 'comunicazioni')
);