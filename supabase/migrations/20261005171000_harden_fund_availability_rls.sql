alter table public.condominium_fund_availability enable row level security;
drop policy if exists condominium_fund_availability_manager_all on public.condominium_fund_availability;
create policy condominium_fund_availability_manager_all on public.condominium_fund_availability
for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'contabilita'))
with check (private.can_manage_workspace_module(workspace_id,'contabilita'));
