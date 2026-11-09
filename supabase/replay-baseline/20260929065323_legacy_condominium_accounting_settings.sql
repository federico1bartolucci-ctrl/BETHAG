-- Replay-only reconstruction of a pre-ledger relation absent from the 247 recorded payloads.
-- Columns, defaults and checks are taken from the read-only Production catalog (2026-11-04).
-- This file is disposable replay scaffolding only; never deploy to QA or Production.
create table public.condominium_accounting_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  accounting_start_date date not null default make_date(extract(year from current_date)::integer, 1, 1),
  accounting_end_date date not null default make_date(extract(year from current_date)::integer, 12, 31),
  ordinary_installment_count integer not null default 12
    constraint condominium_accounting_settings_installment_count_check check (ordinary_installment_count between 1 and 12),
  ordinary_due_dates date[] not null default '{}'::date[]
    constraint condominium_accounting_settings_due_dates_check check (coalesce(array_length(ordinary_due_dates, 1), 0) <= 12),
  extraordinary_mode text not null default 'separata'
    constraint condominium_accounting_settings_extraordinary_mode_check check (extraordinary_mode in ('integrata','separata')),
  extraordinary_allow_multi_year boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
