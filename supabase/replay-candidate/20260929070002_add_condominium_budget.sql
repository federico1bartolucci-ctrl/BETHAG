
create table if not exists public.condominium_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  fiscal_year_id uuid references public.condominium_fiscal_years(id) on delete set null,
  category text not null default 'Generale',
  description text not null default '',
  amount numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.condominium_budgets enable row level security;
drop policy if exists "condominium_budgets_manager_all" on public.condominium_budgets;
create policy "condominium_budgets_manager_all"
on public.condominium_budgets
for all to authenticated
using (private.is_workspace_manager(workspace_id))
with check (private.is_workspace_manager(workspace_id));
grant select, insert, update, delete on public.condominium_budgets to authenticated;
create index if not exists condominium_budgets_workspace_year_idx
  on public.condominium_budgets(workspace_id, condominium_id, fiscal_year_id);
