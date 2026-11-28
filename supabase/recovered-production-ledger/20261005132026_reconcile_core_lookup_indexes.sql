-- Reconcile production lookup indexes for active condominiums and workspace members.
create index if not exists condominiums_active_workspace_idx
  on public.condominiums (workspace_id, archived_at, name);

create index if not exists condominiums_archived_by_idx
  on public.condominiums (archived_by);

create index if not exists workspace_members_condominium_id_idx
  on public.workspace_members (condominium_id);
