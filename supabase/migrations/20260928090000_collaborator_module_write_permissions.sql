-- Allow collaborators to manage modules explicitly granted to them.
create or replace function private.can_manage_workspace_module(target_workspace uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
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

revoke all on function private.can_manage_workspace_module(uuid,text) from public, anon;
grant execute on function private.can_manage_workspace_module(uuid,text) to authenticated;

drop policy if exists "admins manage condominiums" on public.condominiums;
create policy "authorized managers manage condominiums" on public.condominiums for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'condomini'))
with check (private.can_manage_workspace_module(workspace_id,'condomini'));

drop policy if exists "admins manage condominium members" on public.condominium_members;
create policy "authorized managers manage condominium members" on public.condominium_members for all to authenticated
using (exists (select 1 from public.condominiums c where c.id=condominium_members.condominium_id and private.can_manage_workspace_module(c.workspace_id,'condomini')))
with check (exists (select 1 from public.condominiums c where c.id=condominium_members.condominium_id and private.can_manage_workspace_module(c.workspace_id,'condomini')));

drop policy if exists "admins manage documents" on public.documents;
create policy "authorized managers manage documents" on public.documents for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'documenti'))
with check (private.can_manage_workspace_module(workspace_id,'documenti'));

drop policy if exists "admins manage deadlines" on public.deadlines;
create policy "authorized managers manage deadlines" on public.deadlines for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'scadenze'))
with check (private.can_manage_workspace_module(workspace_id,'scadenze'));

drop policy if exists "admins manage assemblies" on public.assemblies;
create policy "authorized managers manage assemblies" on public.assemblies for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'assemblee'))
with check (private.can_manage_workspace_module(workspace_id,'assemblee'));

drop policy if exists "admins manage suppliers" on public.suppliers;
create policy "authorized managers manage suppliers" on public.suppliers for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'fornitori'))
with check (private.can_manage_workspace_module(workspace_id,'fornitori'));

drop policy if exists "admins manage activities" on public.activities;
create policy "authorized managers manage activities" on public.activities for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'attivita'))
with check (private.can_manage_workspace_module(workspace_id,'attivita'));

drop policy if exists "admins manage communications" on public.communications;
create policy "authorized managers manage communications" on public.communications for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'comunicazioni'))
with check (private.can_manage_workspace_module(workspace_id,'comunicazioni'));

drop policy if exists "admins manage requests" on public.condominium_requests;
create policy "authorized managers manage requests" on public.condominium_requests for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'condomini'))
with check (private.can_manage_workspace_module(workspace_id,'condomini'));

drop policy if exists "admins manage portal access" on public.portal_access;
create policy "authorized managers manage portal access" on public.portal_access for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'portale'))
with check (private.can_manage_workspace_module(workspace_id,'portale'));