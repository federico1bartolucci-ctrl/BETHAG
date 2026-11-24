-- Allow only the nested, derived payment_status refresh emitted by the
-- installment AFTER trigger to bypass a second fiscal-year lock on the ledger.
-- The installment's own BEFORE guard already validates/locks its fiscal year.
-- Reacquiring a different parent ledger's fiscal-year lock after sorted ledger
-- locks can deadlock with an opposite-direction move in another fiscal year.
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
  IF tg_table_name = 'condominium_ledger_entries'
     AND tg_op = 'UPDATE'
     AND pg_catalog.pg_trigger_depth() > 1 THEN
    IF (pg_catalog.to_jsonb(new) - 'payment_status')
         IS NOT DISTINCT FROM
       (pg_catalog.to_jsonb(old) - 'payment_status') THEN
      RETURN new;
    END IF;
  END IF;

  if tg_table_name in ('condominium_ledger_entries','condominium_budgets') then
    if tg_op <> 'INSERT' then
      v_old_year_id := old.fiscal_year_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_year_id := new.fiscal_year_id;
    end if;

  elsif tg_table_name = 'condominium_installments' then
    if tg_op <> 'INSERT' then
      v_old_year_id := old.fiscal_year_id;
      v_old_parent_id := old.ledger_entry_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_year_id := new.fiscal_year_id;
      v_new_parent_id := new.ledger_entry_id;
    end if;

    -- Lock old/new ledger parents before fiscal-year rows, matching direct
    -- ledger writes and the installment-total/status-sync triggers.
    for v_parent in
      select le.id
      from public.condominium_ledger_entries le
      where (v_old_parent_id is not null and le.id = v_old_parent_id)
         or (v_new_parent_id is not null and le.id = v_new_parent_id)
      order by le.id
      for update
    loop
      if v_old_parent_id is not null and v_parent.id = v_old_parent_id then
        v_old_parent_found := true;
      end if;
      if v_new_parent_id is not null and v_parent.id = v_new_parent_id then
        v_new_parent_found := true;
      end if;
    end loop;

    if v_old_parent_id is not null and not v_old_parent_found then
      raise exception 'Movimento contabile di origine non trovato';
    end if;
    if v_new_parent_id is not null and not v_new_parent_found then
      raise exception 'Movimento contabile di destinazione non trovato';
    end if;

  elsif tg_table_name = 'condominium_expense_allocations' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.ledger_entry_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
    end if;

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


-- The installment-total guard must acquire both old and new ledger parents in
-- the same UUID order as the AFTER status-sync trigger. Locking only NEW first
-- lets opposite-direction moves hold A/B in reverse order before sync begins.
CREATE OR REPLACE FUNCTION public.validate_condominium_installment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_ledger_id uuid;
  v_new_ledger_id uuid;
  v_ledger_amount numeric;
  v_ledger_found boolean := false;
  v_parent record;
  v_total numeric;
begin
  if new.ledger_entry_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_old_ledger_id := old.ledger_entry_id;
  end if;
  v_new_ledger_id := new.ledger_entry_id;

  for v_parent in
    select le.id, le.amount, le.workspace_id, le.condominium_id, le.direction
    from public.condominium_ledger_entries le
    where (v_old_ledger_id is not null and le.id = v_old_ledger_id)
       or (v_new_ledger_id is not null and le.id = v_new_ledger_id)
    order by le.id
    for update
  loop
    if v_parent.id = v_new_ledger_id
       and v_parent.workspace_id = new.workspace_id
       and v_parent.condominium_id = new.condominium_id
       and v_parent.direction = 'Uscita' then
      v_ledger_amount := v_parent.amount;
      v_ledger_found := true;
    end if;
  end loop;

  if not v_ledger_found or v_ledger_amount is null or v_ledger_amount <= 0 then
    raise exception 'Movimento contabile della rata non valido';
  end if;

  select coalesce(sum(i.amount), 0)
    into v_total
  from public.condominium_installments i
  where i.ledger_entry_id = new.ledger_entry_id
    and i.workspace_id = new.workspace_id
    and i.condominium_id = new.condominium_id
    and i.id is distinct from new.id;

  if round(v_total + new.amount, 2) > round(v_ledger_amount, 2) + 0.005 then
    raise exception 'Il totale delle rate supera l''importo della spesa';
  end if;

  return new;
end;
$function$;
