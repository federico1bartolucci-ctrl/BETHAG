
alter table public.workspace_members
  add column if not exists condominium_id uuid references public.condominiums(id) on delete cascade;

create or replace function public.is_workspace_staff(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
    and wm.role in ('admin','collaborator')
); $$;

create or replace function public.can_access_condominium(target_condominium uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1
  from public.condominiums c
  join public.workspace_members wm on wm.workspace_id = c.workspace_id
  where c.id = target_condominium
    and wm.user_id = auth.uid()
    and wm.active = true
    and (
      wm.role in ('admin','collaborator')
      or wm.condominium_id = target_condominium
    )
); $$;

drop policy if exists "members read documents" on public.documents;
drop policy if exists "members read deadlines" on public.deadlines;
drop policy if exists "members read assemblies" on public.assemblies;
drop policy if exists "members read suppliers" on public.suppliers;
drop policy if exists "members read activities" on public.activities;
drop policy if exists "members read communications" on public.communications;
drop policy if exists "members read requests" on public.condominium_requests;

create policy "authorized users read documents" on public.documents
for select using (public.is_workspace_staff(workspace_id) or public.can_access_condominium(condominium_id));

create policy "authorized users read deadlines" on public.deadlines
for select using (public.is_workspace_staff(workspace_id) or public.can_access_condominium(condominium_id));

create policy "authorized users read assemblies" on public.assemblies
for select using (public.is_workspace_staff(workspace_id) or public.can_access_condominium(condominium_id));

create policy "authorized users read suppliers" on public.suppliers
for select using (public.is_workspace_staff(workspace_id) or public.can_access_condominium(condominium_id));

create policy "authorized users read activities" on public.activities
for select using (public.is_workspace_staff(workspace_id) or public.can_access_condominium(condominium_id));

create policy "authorized users read communications" on public.communications
for select using (public.is_workspace_staff(workspace_id) or public.can_access_condominium(condominium_id));

create policy "authorized users read requests" on public.condominium_requests
for select using (
  public.is_workspace_staff(workspace_id)
  or requester_user_id = auth.uid()
);

drop policy if exists "residents update own requests" on public.condominium_requests;
create policy "residents update own requests" on public.condominium_requests
for update using (
  requester_user_id = auth.uid()
) with check (
  requester_user_id = auth.uid()
);

drop policy if exists "residents create own requests" on public.condominium_requests;
create policy "residents create own requests" on public.condominium_requests
for insert with check (
  requester_user_id = auth.uid()
  and public.can_access_condominium(condominium_id)
);
