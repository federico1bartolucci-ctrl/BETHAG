alter table public.condominium_ledger_entries add column if not exists expense_type text not null default 'Ordinaria';
update public.condominium_ledger_entries set expense_type='Ordinaria' where expense_type is null;
alter table public.condominium_ledger_entries drop constraint if exists condominium_ledger_entries_expense_type_check;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_expense_type_check check (expense_type in ('Ordinaria','Straordinaria'));