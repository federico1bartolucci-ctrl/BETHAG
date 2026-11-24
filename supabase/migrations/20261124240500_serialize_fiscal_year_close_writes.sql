CREATE OR REPLACE FUNCTION public.prevent_closed_condominium_accounting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_year_id uuid;
  v_new_year_id uuid;
  v_old_status text;
  v_new_status text;
  v_old_parent_id uuid;
  v_new_parent_id uuid;
  v_year record;
begin
  if tg_table_name in ('condominium_ledger_entries','condominium_budgets','condominium_installments') then
    if tg_op <> 'INSERT' then
      v_old_year_id := old.fiscal_year_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_year_id := new.fiscal_year_id;
    end if;

  elsif tg_table_name = 'condominium_expense_allocations' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.ledger_entry_id;
      select le.fiscal_year_id
        into v_old_year_id
      from public.condominium_ledger_entries le
      where le.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
      select le.fiscal_year_id
        into v_new_year_id
      from public.condominium_ledger_entries le
      where le.id = v_new_parent_id;
    end if;

  elsif tg_table_name = 'condominium_payment_movements' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.installment_id;
      select i.fiscal_year_id
        into v_old_year_id
      from public.condominium_installments i
      where i.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.installment_id;
      select i.fiscal_year_id
        into v_new_year_id
      from public.condominium_installments i
      where i.id = v_new_parent_id;
    end if;
  end if;

  /*
    Il processo di chiusura blocca la riga dell'esercizio con FOR UPDATE.
    Anche ogni scrittura contabile deve acquisire gli stessi lock prima di
    verificare lo stato: così una scrittura concorrente attende la chiusura
    e, dopo il commit, legge lo stato aggiornato invece di usare "Aperto".
    L'ordinamento per id rende deterministico il lock quando una modifica
    sposta una riga tra due esercizi.
  */
  for v_year in
    select fy.id, fy.status
    from public.condominium_fiscal_years fy
    where fy.id = v_old_year_id
       or fy.id = v_new_year_id
    order by fy.id
    for update
  loop
    if v_year.id = v_old_year_id then
      v_old_status := v_year.status;
    end if;
    if v_year.id = v_new_year_id then
      v_new_status := v_year.status;
    end if;
  end loop;

  if v_old_year_id is not null and v_old_status = 'Chiuso' then
    raise exception 'L''esercizio contabile di origine è chiuso: modifica non consentita.';
  end if;

  if v_new_year_id is not null
     and v_new_year_id is distinct from v_old_year_id
     and v_new_status = 'Chiuso' then
    raise exception 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;
