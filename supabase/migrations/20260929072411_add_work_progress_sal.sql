create table if not exists public.condominium_work_progress (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid not null references public.condominiums(id) on delete cascade,
 work_id uuid not null references public.condominium_works(id) on delete cascade,
 progress_no integer not null,
 progress_date date not null,
 title text not null default '',
 status text not null default 'Presentato',
 percentage numeric not null default 0,
 amount numeric not null default 0,
 paid_amount numeric not null default 0,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(work_id,progress_no)
);
alter table public.condominium_work_progress enable row level security;
drop policy if exists "condominium_work_progress_manager_all" on public.condominium_work_progress;
create policy "condominium_work_progress_manager_all" on public.condominium_work_progress for all to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
grant select,insert,update,delete on public.condominium_work_progress to authenticated;
create index if not exists condominium_work_progress_work_idx on public.condominium_work_progress(work_id,progress_date);