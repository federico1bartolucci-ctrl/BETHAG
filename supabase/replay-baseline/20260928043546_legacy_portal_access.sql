-- Synthetic pre-ledger baseline for the legacy condominium_ledger_entries relation.
-- The recovered 247-entry Production ledger has no CREATE TABLE payload for this relation,
-- although early recorded migrations create functions and triggers that depend on it.
-- Columns are reconstructed from the read-only Production catalog; subsequent ledger
-- payloads remain responsible for their own later indexes, policies and trigger definitions.
create table public.condominium_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  fiscal_year_id uuid,
  entry_date date not null,
  direction text not null,
  category text not null,
  description text not null,
  amount numeric not null,
  payment_status text not null default 'Registrato',
  due_date date,
  supplier_id uuid,
  unit_id uuid,
  member_id uuid,
  document_id uuid,
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fund_id uuid,
  expense_type text not null default 'Ordinaria',
  deliberation_date date,
  assembly_id uuid
);

-- Synthetic pre-ledger baseline for the legacy condominium_expense_allocations relation.
-- Production's first recorded reference is 20260929065325 (ALTER TABLE ... ADD allocation_table_id),
-- while no CREATE TABLE payload exists in the 247-row ledger. The live catalog confirms this
-- relation predates that migration. Reconstruct only its pre-reference columns and core foreign
-- keys here; later recorded migrations add allocation_table_id, indexes, checks, policies and
-- triggers. This is a replay-only reconstruction, not a recovered historical SQL payload.
create table public.condominium_expense_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  ledger_entry_id uuid not null references public.condominium_ledger_entries(id) on delete cascade,
  unit_id uuid,
  member_id uuid references public.condominium_members(id) on delete set null,
  allocation_basis text not null default 'Millesimi',
  millesimi numeric,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  due_date date,
  status text not null default 'Da pagare',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Synthetic pre-ledger baseline for the legacy portal_access relation.
-- This relation predates the first Production migration recorded in schema_migrations.
-- It is kept outside the recovered 247 payloads and is used only by the disposable replay harness.
create table public.portal_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  name text not null,
  email text not null,
  role text not null default 'resident'
    constraint portal_access_role_check check (role in ('resident', 'council')),
  apartment text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  user_id uuid references public.profiles(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  member_id uuid,
  constraint portal_access_workspace_legacy_unique unique (workspace_id, legacy_id)
);

create index portal_access_workspace_idx on public.portal_access(workspace_id);
create index portal_access_condominium_idx on public.portal_access(condominium_id);
create index portal_access_email_idx on public.portal_access(lower(email));
create index portal_access_user_id_idx on public.portal_access(user_id);
create index portal_access_member_id_idx on public.portal_access(member_id);

alter table public.portal_access enable row level security;

create policy "residents read own portal access"
on public.portal_access
for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or user_id = auth.uid()
);


-- The recovered ledger's 20260928043823 payload revokes/grants EXECUTE on
-- private.can_access_resident_condominium(uuid), although the first recorded
-- definition appears only in 20260930185324. The function was therefore already
-- present in the live database before 20260928043823 (likely created outside the
-- recorded ledger). Seed the earliest recoverable implementation here; the
-- later historical migration replaces it with its exact recorded definition.
create or replace function private.can_access_resident_condominium(target_condominium uuid)
returns boolean
language sql stable security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  );
$function$;
