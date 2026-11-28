-- Synthetic pre-ledger baseline for public.condominium_installments.
-- Production contains this relation, but the recovered 247-entry migration ledger has
-- no CREATE TABLE payload for it. Its first recorded use is 20260929065622, which inserts
-- installment rows before later migrations attach accounting guards and validation.
-- Columns and core foreign keys are reconstructed from a read-only Production catalog
-- inspection. Later historical payloads reconcile indexes, checks, RLS policies and triggers.
-- This is a disposable replay prerequisite, never a deployable Production migration.
create table public.condominium_installments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  fiscal_year_id uuid references public.condominium_fiscal_years(id) on delete set null,
  member_id uuid references public.condominium_members(id) on delete set null,
  unit_id uuid references public.condominium_units(id) on delete set null,
  title text not null,
  due_date date,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'Da pagare',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ledger_entry_id uuid references public.condominium_ledger_entries(id) on delete restrict
);
