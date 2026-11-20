-- Replay-only reconstruction of a pre-ledger relation first used by 20260930104150.
-- Columns, checks and foreign keys are reconstructed from the read-only Production catalog.
-- Never deploy this synthetic prerequisite to QA or Production.
create table public.condominium_fiscal_carryovers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  source_fiscal_year_id uuid not null references public.condominium_fiscal_years(id) on delete cascade,
  target_fiscal_year_id uuid not null references public.condominium_fiscal_years(id) on delete cascade,
  unit_id uuid references public.condominium_units(id) on delete set null,
  member_id uuid references public.condominium_members(id) on delete set null,
  balance numeric not null check (abs(balance) >= 0.01),
  kind text not null check (kind in ('Debito','Credito')),
  status text not null default 'Da riportare'
    check (status in ('Da riportare','Parzialmente compensato','Compensato')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
