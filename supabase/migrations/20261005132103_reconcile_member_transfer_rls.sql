-- Reconcile transfer-table RLS with production.
alter table public.condominium_member_transfers enable row level security;
drop policy if exists "condominium_member_transfers_manager_all" on public.condominium_member_transfers;
create policy "condominium_member_transfers_manager_all"
  on public.condominium_member_transfers
  for all to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'condomini'))
  with check (private.can_manage_workspace_module(workspace_id, 'condomini'));
