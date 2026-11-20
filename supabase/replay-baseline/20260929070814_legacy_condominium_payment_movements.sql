-- Synthetic pre-ledger baseline for public.condominium_payment_movements.
-- Production contains this relation, but the recovered 247-entry ledger has no
-- CREATE TABLE payload for it. Its first trigger attachment occurs in the recorded
-- closed-accounting migration; the table must pre-exist that operation.
-- Columns and core constraints are reconstructed from a read-only Production catalog.
-- Later ledger payloads reconcile indexes, RLS policies and triggers.
-- Disposable replay prerequisite only; never deploy to QA or Production.
create table public.condominium_payment_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  installment_id uuid not null references public.condominium_installments(id) on delete cascade,
  payment_date date not null,
  amount numeric not null default 0,
  method text not null default 'Bonifico',
  reference text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint condominium_payment_movements_amount_valid check (amount > 0)
);
