create table if not exists public.condominium_audit_log (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid references public.condominiums(id) on delete cascade,
 entity_type text not null,
 entity_id uuid,
 action text not null,
 description text not null default '',
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.condominium_audit_log enable row level security;
drop policy if exists "condominium_audit_log_manager_all" on public.condominium_audit_log;
create policy "condominium_audit_log_manager_all" on public.condominium_audit_log for all to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
grant select,insert on public.condominium_audit_log to authenticated;
create index if not exists condominium_audit_log_scope_idx on public.condominium_audit_log(workspace_id,condominium_id,created_at desc);