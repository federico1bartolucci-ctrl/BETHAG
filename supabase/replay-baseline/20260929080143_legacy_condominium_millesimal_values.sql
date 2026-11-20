-- Replay-only reconstruction of a pre-ledger relation first indexed by 20260929080144.
-- Definition is reconstructed from the read-only Production catalog (2026-11-04).
-- The historical 247 SQL payloads remain untouched. Never deploy this file to QA/Production.
create table public.condominium_millesimal_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  table_id uuid not null references public.condominium_millesimal_tables(id) on delete cascade,
  unit_id uuid not null references public.condominium_units(id) on delete cascade,
  value numeric not null default 0 check (value >= 0),
  excluded boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_millesimal_values_table_unit_key unique (table_id, unit_id)
);
