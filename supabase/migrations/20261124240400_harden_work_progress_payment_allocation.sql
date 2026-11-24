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