-- Reconcile authenticated DML grants for accounting tables with production.
grant select, insert, update, delete on table public.condominium_expense_allocations to authenticated;
grant select, insert, update, delete on table public.condominium_fiscal_years to authenticated;
grant select, insert, update, delete on table public.condominium_installments to authenticated;
grant select, insert, update, delete on table public.condominium_ledger_entries to authenticated;
grant select on table public.condominium_fiscal_carryovers to authenticated;
grant select on table public.condominium_fiscal_carryover_compensations to authenticated;
grant select on table public.condominium_payment_movements to authenticated;
