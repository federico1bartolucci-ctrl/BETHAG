-- Reconcile core RLS policies with production semantics.

-- Condominiums: one canonical read policy, excluding archived records for all workspace/resident readers.
drop policy if exists "authorized users read condominiums" on public.condominiums;
drop policy if exists "members read condominiums" on public.condominiums;
drop policy if exists "workspace members can read condominiums" on public.condominiums;
drop policy if exists "workspace members can read active condominiums" on public.condominiums;
create policy "workspace members can read active condominiums"
  on public.condominiums for select to authenticated
  using (
    archived_at is null
    and (
      private.can_access_workspace_module(workspace_id, 'condomini')
      or private.can_access_resident_condominium(id)
    )
  );

-- Condominium units: restore the manager CRUD policies and keep resident/council read access.
drop policy if exists "Authorized condominium managers can delete units" on public.condominium_units;
drop policy if exists "Authorized condominium managers can insert units" on public.condominium_units;
drop policy if exists "Authorized condominium managers can update units" on public.condominium_units;
create policy "Authorized condominium managers can delete units"
  on public.condominium_units for delete to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'condomini'));
create policy "Authorized condominium managers can insert units"
  on public.condominium_units for insert to authenticated
  with check (private.can_manage_workspace_module(workspace_id, 'condomini'));
create policy "Authorized condominium managers can update units"
  on public.condominium_units for update to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'condomini'))
  with check (private.can_manage_workspace_module(workspace_id, 'condomini'));

-- Portal registration requests: use the module authorization helper consistently.
drop policy if exists "managers read portal registration requests" on public.portal_registration_requests;
drop policy if exists "managers update portal registration requests" on public.portal_registration_requests;
create policy "managers read portal registration requests"
  on public.portal_registration_requests for select to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'portale'));
create policy "managers update portal registration requests"
  on public.portal_registration_requests for update to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'portale'))
  with check (private.can_manage_workspace_module(workspace_id, 'portale'));
