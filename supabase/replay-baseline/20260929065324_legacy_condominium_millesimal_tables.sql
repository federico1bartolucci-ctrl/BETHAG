-- Synthetic pre-ledger baseline for public.condominium_millesimal_tables.
-- Production's recovered 247-entry migration ledger contains references to this relation
-- from 20260929065325 onward but no CREATE TABLE payload for it. Its presence in Production
-- and absence of a historical CREATE TABLE prove it predates the recorded ledger.
-- Columns and core constraints are reconstructed from the read-only Production catalog.
-- Later ledger payloads remain responsible for RLS policies, indexes and triggers.
-- Replay-only prerequisite: never deploy to QA or Production.
create table public.condominium_millesimal_tables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  description text not null default '',
  total_millesimi numeric not null default 1000,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  basis_type text not null default 'Millesimi'
    constraint condominium_millesimal_tables_basis_type_check
      check (basis_type in ('Millesimi','Quote personalizzate','Consumo','Misto')),
  scope_mode text not null default 'all'
    constraint condominium_millesimal_tables_scope_mode_check
      check (scope_mode in ('all','units','buildings')),
  scope_unit_ids uuid[] not null default '{}'::uuid[],
  scope_building_codes text[] not null default '{}'::text[],
  constraint condominium_millesimal_tables_total_positive check (total_millesimi > 0)
);
