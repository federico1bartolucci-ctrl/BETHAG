create or replace function private.can_access_workspace_module(
  target_workspace uuid,
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
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$;

revoke execute on function private.can_access_workspace_module(uuid, text) from public;
grant execute on function private.can_access_workspace_module(uuid, text) to authenticated;

create or replace function private.can_access_condominium(target_condominium uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.condominiums c
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where c.id = target_condominium
      and wm.user_id = auth.uid()
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? 'condomini'
        )
        or (
          wm.role in ('resident','council')
          and wm.condominium_id = target_condominium
        )
      )
  );
$function$;

drop policy if exists "authorized users read documents" on public.documents;
create policy "authorized users read documents"
on public.documents for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'documenti')
);

drop policy if exists "authorized users read deadlines" on public.deadlines;
create policy "authorized users read deadlines"
on public.deadlines for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'scadenze')
);

drop policy if exists "authorized users read assemblies" on public.assemblies;
create policy "authorized users read assemblies"
on public.assemblies for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'assemblee')
  or private.can_access_condominium(condominium_id)
);

drop policy if exists "authorized users read suppliers" on public.suppliers;
create policy "authorized users read suppliers"
on public.suppliers for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'fornitori')
);

drop policy if exists "authorized users read activities" on public.activities;
create policy "authorized users read activities"
on public.activities for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'attivita')
);

drop policy if exists "authorized users read communications" on public.communications;
create policy "authorized users read communications"
on public.communications for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'comunicazioni')
  or private.can_access_condominium(condominium_id)
);

drop policy if exists "authorized users read requests" on public.condominium_requests;
create policy "authorized users read requests"
on public.condominium_requests for select to authenticated
using (
  private.can_access_workspace_module(workspace_id, 'condomini')
  or requester_user_id = auth.uid()
);

drop policy if exists "members read condominiums" on public.condominiums;
create policy "members read condominiums"
on public.condominiums for select to authenticated
using (
  private.is_workspace_member(workspace_id)
  or private.can_access_condominium(id)
);

drop policy if exists "authorized users read condominium members" on public.condominium_members;
create policy "authorized users read condominium members"
on public.condominium_members for select to authenticated
using (
  private.can_access_workspace_module(
    (select c.workspace_id from public.condominiums c where c.id = condominium_members.condominium_id),
    'condomini'
  )
  or condominium_members.user_id = auth.uid()
);