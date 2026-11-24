-- Protect both SAL ledger references from deletion or accounting-critical edits.
-- This function must bypass the activity-module RLS policy so accounting
-- operators cannot miss linked SAL rows while changing a ledger entry.
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

-- This is a trigger-only SECURITY DEFINER helper. Callers must not receive
-- direct EXECUTE merely because they can update the parent ledger table.
-- Trigger execution remains valid after creation without caller EXECUTE.
REVOKE EXECUTE ON FUNCTION public.guard_ledger_entry_integrity()
  FROM PUBLIC, anon, authenticated;
