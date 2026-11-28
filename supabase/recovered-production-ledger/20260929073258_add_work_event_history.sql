create table if not exists public.condominium_work_events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid not null references public.condominiums(id) on delete cascade,
 work_id uuid not null references public.condominium_works(id) on delete cascade,
 event_type text not null,
 event_date timestamptz not null default now(),
 title text not null default '',
 description text not null default '',
 amount numeric not null default 0,
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.condominium_work_events enable row level security;
drop policy if exists "condominium_work_events_manager_all" on public.condominium_work_events;
create policy "condominium_work_events_manager_all" on public.condominium_work_events for all to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
grant select,insert,update,delete on public.condominium_work_events to authenticated;
create index if not exists condominium_work_events_work_idx on public.condominium_work_events(work_id,event_date);