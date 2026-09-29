-- Harden millesimal allocation integrity.
-- This migration mirrors the production schema hardening already applied.

create unique index if not exists condominium_millesimal_values_workspace_table_unit_uidx
  on public.condominium_millesimal_values (workspace_id, table_id, unit_id);

create index if not exists condominium_expense_allocations_workspace_ledger_idx
  on public.condominium_expense_allocations (workspace_id, condominium_id, ledger_entry_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'condominium_expense_allocations_amount_nonnegative_chk'
      and conrelid = 'public.condominium_expense_allocations'::regclass
  ) then
    alter table public.condominium_expense_allocations
      add constraint condominium_expense_allocations_amount_nonnegative_chk
      check (amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'condominium_expense_allocations_paid_amount_valid_chk'
      and conrelid = 'public.condominium_expense_allocations'::regclass
  ) then
    alter table public.condominium_expense_allocations
      add constraint condominium_expense_allocations_paid_amount_valid_chk
      check (paid_amount >= 0 and paid_amount <= amount);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'condominium_installments_amount_positive_chk'
      and conrelid = 'public.condominium_installments'::regclass
  ) then
    alter table public.condominium_installments
      add constraint condominium_installments_amount_positive_chk
      check (amount > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'condominium_installments_paid_amount_valid_chk'
      and conrelid = 'public.condominium_installments'::regclass
  ) then
    alter table public.condominium_installments
      add constraint condominium_installments_paid_amount_valid_chk
      check (paid_amount >= 0 and paid_amount <= amount);
  end if;
end $$;
