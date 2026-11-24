CREATE OR REPLACE FUNCTION public.guard_ledger_entry_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_allocations integer := 0;
  v_installments integer := 0;
  v_work_progress integer := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT count(*) INTO v_allocations
    FROM public.condominium_expense_allocations
    WHERE workspace_id = OLD.workspace_id
      AND condominium_id = OLD.condominium_id
      AND ledger_entry_id = OLD.id;

    SELECT count(*) INTO v_installments
    FROM public.condominium_installments
    WHERE workspace_id = OLD.workspace_id
      AND condominium_id = OLD.condominium_id
      AND ledger_entry_id = OLD.id;

    SELECT count(*) INTO v_work_progress
    FROM public.condominium_work_progress
    WHERE ledger_entry_id = OLD.id
       OR payment_entry_id = OLD.id;

    IF v_allocations > 0 OR v_installments > 0 THEN
      RAISE EXCEPTION 'La voce contabile è collegata a ripartizioni o rate e non può essere cancellata';
    END IF;

    IF v_work_progress > 0 THEN
      RAISE EXCEPTION 'La voce contabile è collegata a uno o più SAL e non può essere cancellata';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT count(*) INTO v_allocations
    FROM public.condominium_expense_allocations
    WHERE workspace_id = OLD.workspace_id
      AND condominium_id = OLD.condominium_id
      AND ledger_entry_id = OLD.id;

    SELECT count(*) INTO v_installments
    FROM public.condominium_installments
    WHERE workspace_id = OLD.workspace_id
      AND condominium_id = OLD.condominium_id
      AND ledger_entry_id = OLD.id;

    SELECT count(*) INTO v_work_progress
    FROM public.condominium_work_progress
    WHERE ledger_entry_id = OLD.id
       OR payment_entry_id = OLD.id;

    IF (v_allocations > 0 OR v_installments > 0 OR v_work_progress > 0) AND (
      NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.direction IS DISTINCT FROM OLD.direction
      OR NEW.fiscal_year_id IS DISTINCT FROM OLD.fiscal_year_id
      OR NEW.condominium_id IS DISTINCT FROM OLD.condominium_id
      OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
      OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
      OR NEW.document_id IS DISTINCT FROM OLD.document_id
    ) THEN
      RAISE EXCEPTION 'La voce contabile è collegata a ripartizioni, rate o SAL: importo, direzione, esercizio, fornitore, documento e appartenenza non possono essere modificati';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
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
