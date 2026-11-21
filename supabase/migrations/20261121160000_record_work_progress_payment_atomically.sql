-- Atomically register a SAL payment and link its ledger entry.
CREATE OR REPLACE FUNCTION public.record_work_progress_payment(p_progress_id uuid, p_payment_date date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_progress public.condominium_work_progress%rowtype;
  v_work public.condominium_works%rowtype;
  v_date date;
  v_fiscal_year_id uuid;
  v_entry_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  SELECT * INTO v_progress
  FROM public.condominium_work_progress
  WHERE id = p_progress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SAL non trovato';
  END IF;

  IF NOT private.can_manage_workspace_module(v_progress.workspace_id, 'contabilita') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Contabilità richiesta';
  END IF;

  IF v_progress.ledger_entry_id IS NOT NULL OR v_progress.payment_entry_id IS NOT NULL THEN
    RETURN COALESCE(v_progress.ledger_entry_id, v_progress.payment_entry_id);
  END IF;

  IF COALESCE(v_progress.paid_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Il SAL non contiene un importo pagato';
  END IF;

  SELECT * INTO v_work
  FROM public.condominium_works
  WHERE id = v_progress.work_id
    AND workspace_id = v_progress.workspace_id
    AND condominium_id = v_progress.condominium_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervento associato al SAL non trovato';
  END IF;

  v_date := COALESCE(p_payment_date, v_progress.progress_date, CURRENT_DATE);

  SELECT id INTO v_fiscal_year_id
  FROM public.condominium_fiscal_years
  WHERE workspace_id = v_progress.workspace_id
    AND condominium_id = v_progress.condominium_id
    AND status <> 'Chiuso'
    AND v_date BETWEEN start_date AND end_date
  ORDER BY start_date DESC
  LIMIT 1
  FOR SHARE;

  IF v_fiscal_year_id IS NULL THEN
    RAISE EXCEPTION 'Non esiste un esercizio aperto per la data del pagamento';
  END IF;

  INSERT INTO public.condominium_ledger_entries (
    workspace_id, condominium_id, fiscal_year_id, entry_date, direction,
    category, description, amount, payment_status, due_date, supplier_id,
    notes, data
  ) VALUES (
    v_progress.workspace_id, v_progress.condominium_id, v_fiscal_year_id,
    v_date, 'Uscita', 'SAL', v_work.title || ' · SAL ' || v_progress.progress_no,
    v_progress.paid_amount, 'Pagato', v_date, v_work.supplier_id,
    'Pagamento collegato al SAL ' || v_progress.progress_no,
    jsonb_build_object('work_id',v_work.id,'work_progress_id',v_progress.id,'source','SAL')
  ) RETURNING id INTO v_entry_id;

  UPDATE public.condominium_work_progress
  SET ledger_entry_id = v_entry_id, status = 'Pagato', updated_at = now()
  WHERE id = v_progress.id
    AND workspace_id = v_progress.workspace_id;

  RETURN v_entry_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_work_progress_payment(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_work_progress_payment(uuid, date) TO authenticated;
