alter table public.workspace_members
  add column if not exists legacy_id bigint;

create unique index if not exists workspace_members_workspace_legacy_unique
  on public.workspace_members(workspace_id, legacy_id)
  where legacy_id is not null;