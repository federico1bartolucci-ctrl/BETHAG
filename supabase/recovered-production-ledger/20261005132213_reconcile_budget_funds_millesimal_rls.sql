-- Align accounting RLS with production for budgets, funds and millesimal data.

alter table public.condominium_budgets enable row level security;
drop policy if exists condominium_budgets_manager_all on public.condominium_budgets;
create policy condominium_budgets_manager_all
  on public.condominium_budgets
  for all to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'contabilita'))
  with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));

alter table public.condominium_funds enable row level security;
drop policy if exists "Managers can delete condominium_funds" on public.condominium_funds;
drop policy if exists "Managers can insert condominium_funds" on public.condominium_funds;
drop policy if exists "Managers can read condominium_funds" on public.condominium_funds;
drop policy if exists "Managers can update condominium_funds" on public.condominium_funds;
create policy "Managers can delete condominium_funds" on public.condominium_funds for delete to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can insert condominium_funds" on public.condominium_funds for insert to authenticated with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can read condominium_funds" on public.condominium_funds for select to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can update condominium_funds" on public.condominium_funds for update to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita')) with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));

alter table public.condominium_millesimal_tables enable row level security;
drop policy if exists "Managers can delete condominium_millesimal_tables" on public.condominium_millesimal_tables;
drop policy if exists "Managers can insert condominium_millesimal_tables" on public.condominium_millesimal_tables;
drop policy if exists "Managers can read condominium_millesimal_tables" on public.condominium_millesimal_tables;
drop policy if exists "Managers can update condominium_millesimal_tables" on public.condominium_millesimal_tables;
create policy "Managers can delete condominium_millesimal_tables" on public.condominium_millesimal_tables for delete to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can insert condominium_millesimal_tables" on public.condominium_millesimal_tables for insert to authenticated with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can read condominium_millesimal_tables" on public.condominium_millesimal_tables for select to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can update condominium_millesimal_tables" on public.condominium_millesimal_tables for update to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita')) with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));

alter table public.condominium_millesimal_values enable row level security;
drop policy if exists "Managers can delete condominium_millesimal_values" on public.condominium_millesimal_values;
drop policy if exists "Managers can insert condominium_millesimal_values" on public.condominium_millesimal_values;
drop policy if exists "Managers can read condominium_millesimal_values" on public.condominium_millesimal_values;
drop policy if exists "Managers can update condominium_millesimal_values" on public.condominium_millesimal_values;
create policy "Managers can delete condominium_millesimal_values" on public.condominium_millesimal_values for delete to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can insert condominium_millesimal_values" on public.condominium_millesimal_values for insert to authenticated with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can read condominium_millesimal_values" on public.condominium_millesimal_values for select to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita'));
create policy "Managers can update condominium_millesimal_values" on public.condominium_millesimal_values for update to authenticated using (private.can_manage_workspace_module(workspace_id, 'contabilita')) with check (private.can_manage_workspace_module(workspace_id, 'contabilita'));
