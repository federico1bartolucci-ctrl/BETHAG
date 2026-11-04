-- Synthetic pre-ledger baseline for public.condominium_fiscal_years.
-- Production contains this relation, but the recovered 247-entry migration ledger
-- has no CREATE TABLE payload for it. Later ledger payloads depend on it for accounting
-- periods and installments. Columns/core constraints are reconstructed from a read-only
-- Production catalog inspection. Later payloads reconcile policies, indexes and triggers.
-- Disposable replay prerequisite only; never deploy to QA or Production.
create table public.condominium_fiscal_years (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'Aperto',
  opening_balance numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_fiscal_years_valid_dates check (start_date <= end_date),
  constraint condominium_fiscal_years_opening_balance_finite
    check (opening_balance = opening_balance)
);
