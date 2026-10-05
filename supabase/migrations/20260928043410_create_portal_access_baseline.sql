-- Early canonical baseline for the portal access registry.
-- This table must exist before authenticated RLS hardening and portal workflow migrations.

create table if not exists public.portal_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  name text not null,
  email text not null,
  role text not null default 'resident' check (role in ('resident','council')),
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

create index if not exists portal_access_condominium_idx on public.portal_access (condominium_id);
create index if not exists portal_access_email_idx on public.portal_access (lower(email));
create index if not exists portal_access_member_id_idx on public.portal_access (member_id);
create index if not exists portal_access_user_id_idx on public.portal_access (user_id);
create index if not exists portal_access_workspace_idx on public.portal_access (workspace_id);

create unique index if not exists uq_portal_access_workspace_condominium_email_ci
  on public.portal_access (workspace_id, condominium_id, lower(trim(email)))
  where email is not null;

alter table public.portal_access enable row level security;

drop policy if exists "residents read own portal access" on public.portal_access;
create policy "residents read own portal access"
  on public.portal_access as permissive for select to authenticated
  using (
    active = true
    and exists (
      select 1
      from public.condominiums c
      where c.id = portal_access.condominium_id
        and c.archived_at is null
    )
    and (
      user_id = (select auth.uid())
      or (
        user_id is null
        and lower(email) = lower(coalesce((select auth.jwt())->>'email', ''))
      )
    )
  );

revoke all on table public.portal_access from anon;
grant select on table public.portal_access to authenticated;
