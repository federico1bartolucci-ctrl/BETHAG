
create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'resident' check (role in ('admin','collaborator','resident','council')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','collaborator','resident','council')),
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  address text,
  city text,
  postal_code text,
  province text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.condominium_members (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  role text not null default 'resident',
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  title text not null,
  category text,
  status text,
  file_path text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  title text not null,
  due_date date,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assemblies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  title text not null,
  assembly_date timestamptz,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  name text not null,
  category text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  title text not null,
  status text,
  activity_date timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  title text not null,
  body text,
  published boolean not null default false,
  email_status text,
  email_prepared_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.condominium_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  member_id uuid references public.condominium_members(id) on delete set null,
  requester_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'Nuova',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_condominiums_workspace on public.condominiums(workspace_id);
create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_documents_workspace on public.documents(workspace_id);
create index idx_deadlines_workspace on public.deadlines(workspace_id);
create index idx_assemblies_workspace on public.assemblies(workspace_id);
create index idx_suppliers_workspace on public.suppliers(workspace_id);
create index idx_activities_workspace on public.activities(workspace_id);
create index idx_communications_workspace on public.communications(workspace_id);
create index idx_requests_workspace on public.condominium_requests(workspace_id);

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.condominiums enable row level security;
alter table public.condominium_members enable row level security;
alter table public.documents enable row level security;
alter table public.deadlines enable row level security;
alter table public.assemblies enable row level security;
alter table public.suppliers enable row level security;
alter table public.activities enable row level security;
alter table public.communications enable row level security;
alter table public.condominium_requests enable row level security;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
); $$;

create or replace function public.is_workspace_admin(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
    and wm.role = 'admin'
); $$;

create policy "workspace members can read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "admins can manage workspaces" on public.workspaces for all using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

create policy "users can read own profile" on public.profiles for select using (id = auth.uid());
create policy "users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members can read memberships" on public.workspace_members for select using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));
create policy "admins manage memberships" on public.workspace_members for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read condominiums" on public.condominiums for select using (public.is_workspace_member(workspace_id));
create policy "admins manage condominiums" on public.condominiums for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read condominium members" on public.condominium_members for select using (
  exists (select 1 from public.condominiums c where c.id = condominium_id and public.is_workspace_member(c.workspace_id))
);
create policy "admins manage condominium members" on public.condominium_members for all using (
  exists (select 1 from public.condominiums c where c.id = condominium_id and public.is_workspace_admin(c.workspace_id))
) with check (
  exists (select 1 from public.condominiums c where c.id = condominium_id and public.is_workspace_admin(c.workspace_id))
);

create policy "members read documents" on public.documents for select using (public.is_workspace_member(workspace_id));
create policy "admins manage documents" on public.documents for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read deadlines" on public.deadlines for select using (public.is_workspace_member(workspace_id));
create policy "admins manage deadlines" on public.deadlines for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read assemblies" on public.assemblies for select using (public.is_workspace_member(workspace_id));
create policy "admins manage assemblies" on public.assemblies for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read suppliers" on public.suppliers for select using (public.is_workspace_member(workspace_id));
create policy "admins manage suppliers" on public.suppliers for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read activities" on public.activities for select using (public.is_workspace_member(workspace_id));
create policy "admins manage activities" on public.activities for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read communications" on public.communications for select using (public.is_workspace_member(workspace_id));
create policy "admins manage communications" on public.communications for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy "members read requests" on public.condominium_requests for select using (
  public.is_workspace_member(workspace_id)
);
create policy "admins manage requests" on public.condominium_requests for all using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
create policy "residents create own requests" on public.condominium_requests for insert with check (
  requester_user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
);
create policy "residents update own requests" on public.condominium_requests for update using (
  requester_user_id = auth.uid()
) with check (
  requester_user_id = auth.uid()
);
