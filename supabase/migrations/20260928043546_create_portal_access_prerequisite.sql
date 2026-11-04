-- Reconstruct the historically pre-existing portal_access relation before
-- 20260928043547_restrict_data_api_table_grants references it.
-- On Production this is intentionally a no-op: the table already exists.
-- On a clean Supabase branch it establishes the minimum canonical relation
-- required by the following historical migrations.

create table if not exists public.portal_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  name text not null,
  email text not null,
  role text not null default 'resident'
    check (role in ('resident', 'council')),
  apartment text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  user_id uuid references public.profiles(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  member_id uuid references public.condominium_members(id) on delete set null,
  constraint portal_access_workspace_legacy_unique unique (workspace_id, legacy_id)
);

alter table public.portal_access enable row level security;

create index if not exists portal_access_condominium_idx
  on public.portal_access (condominium_id);
create index if not exists portal_access_email_idx
  on public.portal_access (lower(email));
create index if not exists portal_access_member_id_idx
  on public.portal_access (member_id);
create index if not exists portal_access_user_id_idx
  on public.portal_access (user_id);
create index if not exists portal_access_workspace_idx
  on public.portal_access (workspace_id);
