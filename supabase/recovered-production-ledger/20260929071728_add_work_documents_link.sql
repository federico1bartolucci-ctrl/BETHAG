create table if not exists public.condominium_work_documents (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid not null references public.condominiums(id) on delete cascade,
 work_id uuid not null references public.condominium_works(id) on delete cascade,
 document_id uuid,
 title text not null default '',
 notes text not null default '',
 created_at timestamptz not null default now()
);
alter table public.condominium_work_documents enable row level security;
drop policy if exists "condominium_work_documents_manager_all" on public.condominium_work_documents;
create policy "condominium_work_documents_manager_all" on public.condominium_work_documents for all to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
grant select,insert,update,delete on public.condominium_work_documents to authenticated;
create index if not exists condominium_work_documents_work_idx on public.condominium_work_documents(work_id);