
create or replace function public.prevent_closed_condominium_accounting()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_year_id uuid;
  v_status text;
begin
  if tg_table_name = 'condominium_ledger_entries' then
    v_year_id := coalesce(new.fiscal_year_id, old.fiscal_year_id);
  elsif tg_table_name = 'condominium_budgets' then
    v_year_id := coalesce(new.fiscal_year_id, old.fiscal_year_id);
  elsif tg_table_name = 'condominium_installments' then
    v_year_id := coalesce(new.fiscal_year_id, old.fiscal_year_id);
  elsif tg_table_name = 'condominium_expense_allocations' then
    select fiscal_year_id into v_year_id
    from public.condominium_ledger_entries
    where id = coalesce(new.ledger_entry_id, old.ledger_entry_id);
  elsif tg_table_name = 'condominium_payment_movements' then
    select fiscal_year_id into v_year_id
    from public.condominium_installments
    where id = coalesce(new.installment_id, old.installment_id);
  end if;

  if v_year_id is not null then
    select status into v_status
    from public.condominium_fiscal_years
    where id = v_year_id;

    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso: modifica non consentita.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_block_closed_ledger on public.condominium_ledger_entries;
create trigger trg_block_closed_ledger
before insert or update or delete on public.condominium_ledger_entries
for each row execute function public.prevent_closed_condominium_accounting();

drop trigger if exists trg_block_closed_budgets on public.condominium_budgets;
create trigger trg_block_closed_budgets
before insert or update or delete on public.condominium_budgets
for each row execute function public.prevent_closed_condominium_accounting();

drop trigger if exists trg_block_closed_installments on public.condominium_installments;
create trigger trg_block_closed_installments
before insert or update or delete on public.condominium_installments
for each row execute function public.prevent_closed_condominium_accounting();

drop trigger if exists trg_block_closed_allocations on public.condominium_expense_allocations;
create trigger trg_block_closed_allocations
before insert or update or delete on public.condominium_expense_allocations
for each row execute function public.prevent_closed_condominium_accounting();

drop trigger if exists trg_block_closed_payments on public.condominium_payment_movements;
create trigger trg_block_closed_payments
before insert or update or delete on public.condominium_payment_movements
for each row execute function public.prevent_closed_condominium_accounting();
