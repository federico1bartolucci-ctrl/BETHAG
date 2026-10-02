-- Prevent edits, deletes, or moves from/to closed condominium fiscal years.
-- Captures both source and destination fiscal years for parent and child accounting rows.
create or replace function public.prevent_closed_condominium_accounting()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old_year_id uuid;
  v_new_year_id uuid;
  v_status text;
  v_old_parent_id uuid;
  v_new_parent_id uuid;
begin
  if tg_table_name in ('condominium_ledger_entries','condominium_budgets','condominium_installments') then
    if tg_op <> 'INSERT' then v_old_year_id := old.fiscal_year_id; end if;
    if tg_op <> 'DELETE' then v_new_year_id := new.fiscal_year_id; end if;
  elsif tg_table_name = 'condominium_expense_allocations' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.ledger_entry_id;
      select le.fiscal_year_id into v_old_year_id
      from public.condominium_ledger_entries le where le.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
      select le.fiscal_year_id into v_new_year_id
      from public.condominium_ledger_entries le where le.id = v_new_parent_id;
    end if;
  elsif tg_table_name = 'condominium_payment_movements' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.installment_id;
      select i.fiscal_year_id into v_old_year_id
      from public.condominium_installments i where i.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.installment_id;
      select i.fiscal_year_id into v_new_year_id
      from public.condominium_installments i where i.id = v_new_parent_id;
    end if;
  end if;

  if v_old_year_id is not null then
    select fy.status into v_status
    from public.condominium_fiscal_years fy where fy.id = v_old_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile di origine è chiuso: modifica non consentita.';
    end if;
  end if;

  if v_new_year_id is not null and v_new_year_id is distinct from v_old_year_id then
    select fy.status into v_status
    from public.condominium_fiscal_years fy where fy.id = v_new_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
