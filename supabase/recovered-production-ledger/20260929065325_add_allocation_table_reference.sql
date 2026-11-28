alter table public.condominium_expense_allocations
    add column if not exists allocation_table_id uuid references public.condominium_millesimal_tables(id) on delete set null;
create index if not exists condominium_expense_allocations_table_idx
    on public.condominium_expense_allocations(allocation_table_id);
