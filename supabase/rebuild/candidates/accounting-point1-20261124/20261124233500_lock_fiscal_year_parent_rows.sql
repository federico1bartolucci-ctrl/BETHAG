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
  v_old_parent_found boolean := false;
  v_new_parent_found boolean := false;
  v_parent record;
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
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
    end if;

    /*
      Lock the referenced ledger rows before reading fiscal_year_id.
      Without this parent lock, a concurrent ledger move can make this
      trigger read the old fiscal year, wait on its lock, and then write
      an allocation against the parent's new (possibly closing/closed) year.
      Lock old and new parents in UUID order to avoid update-move deadlocks.
    */
    for v_parent in
      select le.id, le.fiscal_year_id
      from public.condominium_ledger_entries le
      where (v_old_parent_id is not null and le.id = v_old_parent_id)
         or (v_new_parent_id is not null and le.id = v_new_parent_id)
      order by le.id
      for share
    loop
      if v_old_parent_id is not null and v_parent.id = v_old_parent_id then
        v_old_parent_found := true;
        v_old_year_id := v_parent.fiscal_year_id;
      end if;
      if v_new_parent_id is not null and v_parent.id = v_new_parent_id then
        v_new_parent_found := true;
        v_new_year_id := v_parent.fiscal_year_id;
      end if;
    end loop;

    if v_old_parent_id is not null and not v_old_parent_found then
      raise exception 'Movimento contabile di origine non trovato';
    end if;
    if v_new_parent_id is not null and not v_new_parent_found then
      raise exception 'Movimento contabile di destinazione non trovato';
    end if;

  elsif tg_table_name = 'condominium_payment_movements' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.installment_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.installment_id;
    end if;

    /*
      Lock the referenced installment rows before reading fiscal_year_id.
      This serializes payment-movement writes with concurrent installment
      fiscal-year moves and with fiscal-year closure. Old/new parents are
      locked in UUID order for deterministic update behavior.
    */
    for v_parent in
      select i.id, i.fiscal_year_id
      from public.condominium_installments i
      where (v_old_parent_id is not null and i.id = v_old_parent_id)
         or (v_new_parent_id is not null and i.id = v_new_parent_id)
      order by i.id
      for share
    loop
      if v_old_parent_id is not null and v_parent.id = v_old_parent_id then
        v_old_parent_found := true;
        v_old_year_id := v_parent.fiscal_year_id;
      end if;
      if v_new_parent_id is not null and v_parent.id = v_new_parent_id then
        v_new_parent_found := true;
        v_new_year_id := v_parent.fiscal_year_id;
      end if;
    end loop;

    if v_old_parent_id is not null and not v_old_parent_found then
      raise exception 'Rata di origine non trovata';
    end if;
    if v_new_parent_id is not null and not v_new_parent_found then
      raise exception 'Rata di destinazione non trovata';
    end if;
  end if;

  /*
    The close operation locks fiscal-year rows with FOR UPDATE. Every
    accounting write must lock the same rows before checking status. Sorting
    by UUID makes locks deterministic when a row moves between two years.
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