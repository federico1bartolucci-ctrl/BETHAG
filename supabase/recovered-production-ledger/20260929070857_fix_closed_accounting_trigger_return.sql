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
    v_year_id := case when tg_op = 'DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name = 'condominium_budgets' then
    v_year_id := case when tg_op = 'DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name = 'condominium_installments' then
    v_year_id := case when tg_op = 'DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name = 'condominium_expense_allocations' then
    select fiscal_year_id into v_year_id from public.condominium_ledger_entries
    where id = case when tg_op = 'DELETE' then old.ledger_entry_id else new.ledger_entry_id end;
  elsif tg_table_name = 'condominium_payment_movements' then
    select fiscal_year_id into v_year_id from public.condominium_installments
    where id = case when tg_op = 'DELETE' then old.installment_id else new.installment_id end;
  end if;

  if v_year_id is not null then
    select status into v_status from public.condominium_fiscal_years where id = v_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso: modifica non consentita.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;