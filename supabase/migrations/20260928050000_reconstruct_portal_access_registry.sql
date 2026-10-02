-- Reconstructed portal registry continuation.
-- The table is created by 20260928043430_create_portal_access_baseline.sql,
-- before grants, indexes and policy migrations that reference it.
-- Keep this migration idempotent because it may also be replayed against
-- environments where the registry already exists.

create table if not exists public.portal_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  legacy_id bigint,
  name text not null,
  email text not null,
  role text not null default 'resident'::text,
  apartment text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  user_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  member_id uuid,
  constraint portal_access_workspace_id_fkey
    foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint portal_access_condominium_id_fkey
    foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  constraint portal_access_member_id_fkey
    foreign key (member_id) references public.condominium_members(id) on delete set null,
  constraint portal_access_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null,
  constraint portal_access_role_check
    check (role = any (array['resident'::text, 'council'::text])),
  constraint portal_access_workspace_legacy_unique
    unique (workspace_id, legacy_id)
);

create index if not exists portal_access_condominium_idx
  on public.portal_access using btree (condominium_id);
create index if not exists portal_access_email_idx
  on public.portal_access using btree (lower(email));
create index if not exists portal_access_member_id_idx
  on public.portal_access using btree (member_id);
create index if not exists portal_access_user_id_idx
  on public.portal_access using btree (user_id);
create index if not exists portal_access_workspace_idx
  on public.portal_access using btree (workspace_id);
create unique index if not exists uq_portal_access_workspace_condominium_email_ci
  on public.portal_access using btree (workspace_id, condominium_id, lower(email))
  where (email is not null);

alter table public.portal_access enable row level security;

grant select, insert, update, delete on table public.portal_access to authenticated;
grant select, insert, update, delete on table public.portal_access to service_role;

-- The manager policy is installed later, after its helper function exists.
drop policy if exists "residents read own portal access"
  on public.portal_access;
create policy "residents read own portal access"
  on public.portal_access for select to authenticated
  using (
    active = true
    and exists (
      select 1 from public.condominiums c
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
