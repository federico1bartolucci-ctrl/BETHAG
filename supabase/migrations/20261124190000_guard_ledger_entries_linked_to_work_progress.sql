-- Protect SAL accounting references from ledger deletion or critical edits.
-- condominium_work_progress uses ON DELETE SET NULL for both ledger links;
-- without this guard a ledger deletion silently detaches the SAL from its
-- expense/payment record while retaining the paid amount.
CREATE OR REPLACE FUNCTION public.guard_ledger_entry_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
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
    WHERE workspace_id = OLD.workspace_id
      AND condominium_id = OLD.condominium_id
      AND (ledger_entry_id = OLD.id OR payment_entry_id = OLD.id);

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
    WHERE workspace_id = OLD.workspace_id
      AND condominium_id = OLD.condominium_id
      AND (ledger_entry_id = OLD.id OR payment_entry_id = OLD.id);

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
