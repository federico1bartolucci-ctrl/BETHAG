CREATE OR REPLACE FUNCTION public.guard_ledger_entry_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_allocations integer := 0;
  v_installments integer := 0;
  v_work_progress_payments integer := 0;
begin
  if tg_op='DELETE' then
    select count(*) into v_allocations
    from public.condominium_expense_allocations
    where workspace_id=old.workspace_id
      and condominium_id=old.condominium_id
      and ledger_entry_id=old.id;

    select count(*) into v_installments
    from public.condominium_installments
    where workspace_id=old.workspace_id
      and condominium_id=old.condominium_id
      and ledger_entry_id=old.id;

    select count(*) into v_work_progress_payments
    from public.condominium_work_progress
    where payment_entry_id=old.id;

    if v_allocations>0 or v_installments>0 or v_work_progress_payments>0 then
      raise exception 'La voce contabile è collegata a ripartizioni, rate o SAL e non può essere cancellata';
    end if;
    return old;
  end if;

  if tg_op='UPDATE' then
    select count(*) into v_allocations
    from public.condominium_expense_allocations
    where workspace_id=old.workspace_id
      and condominium_id=old.condominium_id
      and ledger_entry_id=old.id;

    select count(*) into v_installments
    from public.condominium_installments
    where workspace_id=old.workspace_id
      and condominium_id=old.condominium_id
      and ledger_entry_id=old.id;

    select count(*) into v_work_progress_payments
    from public.condominium_work_progress
    where payment_entry_id=old.id;

    if (v_allocations>0 or v_installments>0 or v_work_progress_payments>0) and (
      new.amount is distinct from old.amount
      or new.direction is distinct from old.direction
      or new.fiscal_year_id is distinct from old.fiscal_year_id
      or new.condominium_id is distinct from old.condominium_id
      or new.workspace_id is distinct from old.workspace_id
      or new.supplier_id is distinct from old.supplier_id
      or new.document_id is distinct from old.document_id
    ) then
      raise exception 'La voce contabile è già collegata a ripartizioni, rate o SAL: importo, direzione, esercizio, fornitore, documento e appartenenza non possono essere modificati';
    end if;
    return new;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_progress_accounting_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  w record;
  l record;
  p record;
  v_other_paid numeric := 0;
begin
  select workspace_id, condominium_id, supplier_id
    into w
  from public.condominium_works
  where id = new.work_id;

  if not found then
    raise exception 'Lavoro collegato al SAL non trovato';
  end if;

  if new.ledger_entry_id is not null then
    select workspace_id, condominium_id, direction, supplier_id
      into l
    from public.condominium_ledger_entries
    where id = new.ledger_entry_id;

    if not found
       or l.workspace_id <> w.workspace_id
       or l.condominium_id <> w.condominium_id then
      raise exception 'Movimento contabile non coerente con il lavoro';
    end if;

    if l.direction <> 'Uscita' then
      raise exception 'Il movimento contabile della spesa deve essere un''Uscita';
    end if;

    if w.supplier_id is not null
       and l.supplier_id is not null
       and w.supplier_id <> l.supplier_id then
      raise exception 'Il fornitore del movimento contabile non coincide con quello del lavoro';
    end if;
  end if;

  if new.payment_entry_id is not null then
    if new.ledger_entry_id is not null
       and new.payment_entry_id = new.ledger_entry_id then
      raise exception 'Il movimento di pagamento deve essere distinto dal movimento della spesa';
    end if;

    /*
      Lock del movimento: serializza i SAL che tentano di imputare lo stesso
      pagamento, evitando che due transazioni concorrenti superino il controllo
      cumulativo leggendo entrambe il medesimo residuo.
    */
    select workspace_id, condominium_id, direction, supplier_id, amount
      into p
    from public.condominium_ledger_entries
    where id = new.payment_entry_id
    for update;

    if not found
       or p.workspace_id <> w.workspace_id
       or p.condominium_id <> w.condominium_id then
      raise exception 'Movimento di pagamento non coerente con il lavoro';
    end if;

    if p.direction <> 'Uscita' then
      raise exception 'Il movimento di pagamento deve essere un''Uscita';
    end if;

    if w.supplier_id is not null
       and p.supplier_id is not null
       and w.supplier_id <> p.supplier_id then
      raise exception 'Il fornitore del pagamento non coincide con quello del lavoro';
    end if;

    select coalesce(sum(wp.paid_amount), 0)
      into v_other_paid
    from public.condominium_work_progress wp
    where wp.payment_entry_id = new.payment_entry_id
      and wp.id is distinct from new.id;

    if v_other_paid + coalesce(new.paid_amount, 0) > coalesce(p.amount, 0) + 0.005 then
      raise exception 'La somma dei SAL collegati supera l''importo del movimento di pagamento';
    end if;
  end if;

  return new;
end;
$function$;
