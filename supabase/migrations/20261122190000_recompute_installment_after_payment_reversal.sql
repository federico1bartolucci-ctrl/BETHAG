-- Recompute installment and expense allocations after reversing a payment.
-- Historical baseline migrations are intentionally left untouched.
CREATE OR REPLACE FUNCTION private.reverse_condominium_installment_payment(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_payment_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_payment public.condominium_payment_movements%rowtype;
  v_installment public.condominium_installments%rowtype;
  v_year_status text;
  v_actor uuid;
  v_paid numeric;
  v_status text;
  v_allocation public.condominium_expense_allocations%rowtype;
  v_owner_user_id uuid;
  v_owner_email text;
  v_remaining numeric;
  v_target numeric;
  v_allocation_paid numeric;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Autenticazione richiesta'; END IF;
  IF NOT private.can_manage_workspace_module(p_workspace_id,'contabilita') THEN
    RAISE EXCEPTION 'Autorizzazione gestione contabilità richiesta';
  END IF;
  IF nullif(trim(coalesce(p_reason,'')),'') IS NULL THEN
    RAISE EXCEPTION 'La motivazione dello storno è obbligatoria';
  END IF;

  SELECT * INTO v_payment
  FROM public.condominium_payment_movements
  WHERE id=p_payment_id AND workspace_id=p_workspace_id AND condominium_id=p_condominium_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento non trovato o non appartenente al condominio'; END IF;

  SELECT * INTO v_installment
  FROM public.condominium_installments
  WHERE id=v_payment.installment_id AND workspace_id=p_workspace_id AND condominium_id=p_condominium_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rata associata al pagamento non trovata'; END IF;

  SELECT fy.status INTO v_year_status
  FROM public.condominium_fiscal_years fy
  WHERE fy.id=v_installment.fiscal_year_id
    AND fy.workspace_id=p_workspace_id AND fy.condominium_id=p_condominium_id;
  IF v_year_status='Chiuso' THEN
    RAISE EXCEPTION 'L''esercizio contabile è chiuso: storno non consentito';
  END IF;
  IF EXISTS (SELECT 1 FROM public.condominium_payment_reversal_audit WHERE original_payment_id=v_payment.id) THEN
    RAISE EXCEPTION 'Il pagamento è già stato stornato';
  END IF;

  INSERT INTO public.condominium_payment_reversal_audit(
    original_payment_id,workspace_id,condominium_id,installment_id,amount,payment_date,
    method,reference,notes,reversal_reason,reversed_by
  ) VALUES (
    v_payment.id,v_payment.workspace_id,v_payment.condominium_id,v_payment.installment_id,
    v_payment.amount,v_payment.payment_date,v_payment.method,v_payment.reference,v_payment.notes,
    trim(p_reason),v_actor
  );

  DELETE FROM public.condominium_payment_movements WHERE id=v_payment.id;

  SELECT round(coalesce(sum(pm.amount),0),2) INTO v_paid
  FROM public.condominium_payment_movements pm
  WHERE pm.workspace_id=p_workspace_id AND pm.condominium_id=p_condominium_id
    AND pm.installment_id=v_installment.id;
  v_paid:=least(round(coalesce(v_installment.amount,0),2),greatest(v_paid,0));
  IF v_paid>=v_installment.amount-0.005 THEN
    v_paid:=round(v_installment.amount,2); v_status:='Pagato';
  ELSIF v_paid>0 THEN v_status:='Parzialmente pagato';
  ELSE v_status:='Da pagare';
  END IF;

  PERFORM set_config('bethag.allow_installment_paid_update','on',true);
  UPDATE public.condominium_installments
  SET paid_amount=v_paid,status=v_status
  WHERE id=v_installment.id AND workspace_id=p_workspace_id AND condominium_id=p_condominium_id;

  PERFORM set_config('bethag.allow_allocation_paid_update','on',true);
  IF v_installment.ledger_entry_id IS NOT NULL THEN
    IF v_installment.unit_id IS NULL AND v_installment.member_id IS NOT NULL THEN
      SELECT cm.user_id,nullif(lower(trim(cm.email)),'')
      INTO v_owner_user_id,v_owner_email
      FROM public.condominium_members cm
      WHERE cm.id=v_installment.member_id AND cm.condominium_id=p_condominium_id
        AND cm.active AND trim(coalesce(cm.data->>'role',''))='Proprietario';
      IF NOT FOUND THEN RAISE EXCEPTION 'Proprietario della rata unificata non valido'; END IF;
      v_remaining:=v_paid;
      FOR v_allocation IN
        SELECT a.* FROM public.condominium_expense_allocations a
        WHERE a.workspace_id=p_workspace_id AND a.condominium_id=p_condominium_id
          AND a.ledger_entry_id=v_installment.ledger_entry_id
          AND EXISTS (
            SELECT 1 FROM public.condominium_members cm
            WHERE cm.condominium_id=p_condominium_id AND cm.unit_id=a.unit_id
              AND cm.active AND trim(coalesce(cm.data->>'role',''))='Proprietario'
              AND ((v_owner_user_id IS NOT NULL AND cm.user_id=v_owner_user_id)
                OR (v_owner_user_id IS NULL AND nullif(lower(trim(cm.email)),'') IS NOT NULL
                    AND nullif(lower(trim(cm.email)),'')=v_owner_email))
          )
        ORDER BY a.id FOR UPDATE
      LOOP
        v_target:=least(round(coalesce(v_allocation.amount,0),2),greatest(round(v_remaining,2),0));
        UPDATE public.condominium_expense_allocations
        SET paid_amount=v_target,status=CASE
          WHEN v_target>=amount-0.005 THEN 'Pagato'
          WHEN v_target>0 THEN 'Parzialmente pagato' ELSE 'Da pagare' END
        WHERE id=v_allocation.id;
        v_remaining:=round(v_remaining-v_target,2);
        EXIT WHEN v_remaining<=0.005;
      END LOOP;
      IF v_remaining>0.005 THEN
        RAISE EXCEPTION 'Storno: saldo rata non riconciliato con le ripartizioni del proprietario';
      END IF;
    ELSE
      FOR v_allocation IN
        SELECT a.* FROM public.condominium_expense_allocations a
        WHERE a.workspace_id=p_workspace_id AND a.condominium_id=p_condominium_id
          AND a.ledger_entry_id=v_installment.ledger_entry_id
          AND a.unit_id IS NOT DISTINCT FROM v_installment.unit_id
          AND ((v_installment.member_id IS NOT NULL AND a.member_id=v_installment.member_id)
            OR (v_installment.member_id IS NULL AND a.member_id IS NULL))
        ORDER BY a.id FOR UPDATE
      LOOP
        SELECT least(v_allocation.amount,coalesce(sum(i.paid_amount),0))
        INTO v_allocation_paid
        FROM public.condominium_installments i
        WHERE i.workspace_id=p_workspace_id AND i.condominium_id=p_condominium_id
          AND i.ledger_entry_id=v_installment.ledger_entry_id
          AND i.unit_id IS NOT DISTINCT FROM v_allocation.unit_id
          AND ((v_installment.member_id IS NOT NULL AND i.member_id=v_installment.member_id)
            OR (v_installment.member_id IS NULL AND i.member_id IS NULL));
        UPDATE public.condominium_expense_allocations
        SET paid_amount=coalesce(v_allocation_paid,0),status=CASE
          WHEN coalesce(v_allocation_paid,0)>=amount-0.005 THEN 'Pagato'
          WHEN coalesce(v_allocation_paid,0)>0 THEN 'Parzialmente pagato' ELSE 'Da pagare' END
        WHERE id=v_allocation.id;
      END LOOP;
    END IF;
  END IF;
  RETURN true;
END;
$function$;
