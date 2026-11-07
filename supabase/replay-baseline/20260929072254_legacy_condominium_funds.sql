-- Replay-only reconstruction of a pre-ledger relation.
-- Source: read-only Production catalog inspection (2026-11-04).
-- The 247 recovered ledger payloads contain no CREATE TABLE for this relation.
create table public.condominium_funds (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  purpose text not null default '',
  target_amount numeric not null default 0,
  allocated_amount numeric not null default 0,
  used_amount numeric not null default 0,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_funds_nonnegative_amounts
    check (target_amount >= 0 and allocated_amount >= 0 and used_amount >= 0),
  constraint condominium_funds_used_lte_allocated
    check (used_amount <= allocated_amount)
);
