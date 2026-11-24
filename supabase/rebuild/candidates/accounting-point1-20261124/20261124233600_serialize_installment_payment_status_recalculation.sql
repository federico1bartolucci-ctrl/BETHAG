-- Serialize installment payment-status recalculation per ledger row.
-- Without the parent lock, concurrent updates to different installments can
-- each aggregate a snapshot that excludes the other transaction's change and
-- leave payment_status stale after both transactions commit.
CREATE OR REPLACE FUNCTION public.sync_condominium_expense_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger_ids uuid[];
  v_ledger_id uuid;
  v_total numeric;
  v_paid numeric;
  v_status text;
  v_has_installments boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_ledger_ids := ARRAY[NEW.ledger_entry_id];
  ELSIF TG_OP = 'DELETE' THEN
    v_ledger_ids := ARRAY[OLD.ledger_entry_id];
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.ledger_entry_id IS DISTINCT FROM NEW.ledger_entry_id THEN
      v_ledger_ids := ARRAY[OLD.ledger_entry_id, NEW.ledger_entry_id];
    ELSE
      v_ledger_ids := ARRAY[NEW.ledger_entry_id];
    END IF;
  END IF;

  -- Lock every affected ledger in deterministic UUID order before computing
  -- any aggregate. The next SELECT gets a fresh READ COMMITTED snapshot after
  -- a concurrent writer releases the same parent row.
  FOR v_ledger_id IN
    SELECT DISTINCT candidate.ledger_id
    FROM unnest(coalesce(v_ledger_ids, ARRAY[]::uuid[])) AS candidate(ledger_id)
    WHERE candidate.ledger_id IS NOT NULL
    ORDER BY candidate.ledger_id
  LOOP
    PERFORM 1
    FROM public.condominium_ledger_entries
    WHERE id = v_ledger_id
    FOR NO KEY UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT coalesce(sum(amount), 0),
           coalesce(sum(paid_amount), 0),
           count(*) > 0
      INTO v_total, v_paid, v_has_installments
    FROM public.condominium_installments
    WHERE ledger_entry_id = v_ledger_id;

    IF NOT v_has_installments THEN
      v_status := 'Registrato';
    ELSIF v_paid >= v_total - 0.005 AND v_total > 0 THEN
      v_status := 'Pagato';
    ELSIF v_paid > 0 THEN
      v_status := 'Parzialmente pagato';
    ELSIF EXISTS (
      SELECT 1
      FROM public.condominium_installments
      WHERE ledger_entry_id = v_ledger_id
        AND due_date < current_date
        AND paid_amount < amount
    ) THEN
      v_status := 'Scaduto';
    ELSE
      v_status := 'Da pagare';
    END IF;

    UPDATE public.condominium_ledger_entries
    SET payment_status = v_status
    WHERE id = v_ledger_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
