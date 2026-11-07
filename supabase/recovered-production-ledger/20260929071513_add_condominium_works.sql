create table if not exists public.condominium_works (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid not null references public.condominiums(id) on delete cascade,
 title text not null,
 category text not null default 'Manutenzione',
 description text not null default '',
 status text not null default 'Da programmare',
 priority text not null default 'Media',
 supplier_id uuid references public.condominium_suppliers(id) on delete set null,
 register_item_id uuid references public.condominium_register_items(id) on delete set null,
 start_date date,
 expected_end_date date,
 actual_end_date date,
 estimated_amount numeric not null default 0,
 approved_amount numeric not null default 0,
 actual_amount numeric not null default 0,
 notes text not null default '',
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.condominium_works enable row level security;
drop policy if exists "condominium_works_manager_all" on public.condominium_works;
create policy "condominium_works_manager_all" on public.condominium_works for all to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
grant select,insert,update,delete on public.condominium_works to authenticated;
create index if not exists condominium_works_workspace_condo_idx on public.condominium_works(workspace_id,condominium_id,status);
