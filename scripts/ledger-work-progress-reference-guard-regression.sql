-- Runtime regression: ledger rows referenced by SAL expense/payment links
-- cannot be deleted or have accounting-critical fields changed.
ALTER TABLE public.condominium_installments
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS condominium_id uuid;
ALTER TABLE public.condominium_ledger_entries
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS document_id uuid;

CREATE TABLE IF NOT EXISTS public.condominium_expense_allocations (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  ledger_entry_id uuid NOT NULL
);

CREATE TABLE public.condominium_work_progress (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  ledger_entry_id uuid REFERENCES public.condominium_ledger_entries(id) ON DELETE SET NULL,
  payment_entry_id uuid REFERENCES public.condominium_ledger_entries(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  paid_amount numeric NOT NULL
);

DO $role_setup$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END; $role_setup$;

\i supabase/rebuild/candidates/accounting-point1-20261124/20261124240200_guard_ledger_entries_linked_to_work_progress.sql

-- Reproduce the real module boundary: authenticated accounting users cannot
-- read SAL rows under the activity-module RLS policy.
ALTER TABLE public.condominium_work_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_progress_rls_regression_deny ON public.condominium_work_progress;
CREATE POLICY work_progress_rls_regression_deny
  ON public.condominium_work_progress FOR SELECT TO authenticated USING (false);
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.condominium_work_progress TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.condominium_ledger_entries TO authenticated;

DROP TRIGGER IF EXISTS trg_guard_ledger_entry_integrity_test
  ON public.condominium_ledger_entries;
CREATE TRIGGER trg_guard_ledger_entry_integrity_test
BEFORE DELETE OR UPDATE ON public.condominium_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_ledger_entry_integrity();

INSERT INTO public.condominium_ledger_entries
  (id, workspace_id, condominium_id, fiscal_year_id, direction, amount, payment_status, due_date)
VALUES
  ('00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000005',
   'Uscita', 500.00, 'Registrato', current_date),
  ('00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000005',
   'Uscita', 200.00, 'Registrato', current_date);

INSERT INTO public.condominium_work_progress
  (id, workspace_id, condominium_id, ledger_entry_id, amount, paid_amount)
VALUES
  ('00000000-0000-0000-0000-000000000040',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000030', 500.00, 0.00);
INSERT INTO public.condominium_work_progress
  (id, workspace_id, condominium_id, payment_entry_id, amount, paid_amount)
VALUES
  ('00000000-0000-0000-0000-000000000041',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000031', 200.00, 150.00);

DO $visible_sal_guard$
BEGIN
  BEGIN
    DELETE FROM public.condominium_ledger_entries
    WHERE id='00000000-0000-0000-0000-000000000030';
    RAISE EXCEPTION 'Regression: deleting a SAL expense ledger entry was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'La voce contabile è collegata a uno o più SAL%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    DELETE FROM public.condominium_ledger_entries
    WHERE id='00000000-0000-0000-0000-000000000031';
    RAISE EXCEPTION 'Regression: deleting a SAL payment ledger entry was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'La voce contabile è collegata a uno o più SAL%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.condominium_ledger_entries
    SET amount=501.00
    WHERE id='00000000-0000-0000-0000-000000000030';
    RAISE EXCEPTION 'Regression: changing a linked SAL ledger amount was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'La voce contabile è collegata a ripartizioni, rate o SAL:%' THEN
      RAISE;
    END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE id='00000000-0000-0000-0000-000000000040'
      AND ledger_entry_id='00000000-0000-0000-0000-000000000030'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.condominium_work_progress
    WHERE id='00000000-0000-0000-0000-000000000041'
      AND payment_entry_id='00000000-0000-0000-0000-000000000031'
      AND paid_amount=150.00
  ) THEN
    RAISE EXCEPTION 'Regression: SAL accounting references or paid amount were changed';
  END IF;
END; $visible_sal_guard$;

-- The caller cannot see SAL rows, but the trigger must still enforce their links.
SET ROLE authenticated;
DO $hidden_sal_guard$
BEGIN
  IF (SELECT count(*) FROM public.condominium_work_progress) <> 0 THEN
    RAISE EXCEPTION 'Regression: authenticated accounting user unexpectedly sees activity SAL rows';
  END IF;

  BEGIN
    DELETE FROM public.condominium_ledger_entries
    WHERE id='00000000-0000-0000-0000-000000000030';
    RAISE EXCEPTION 'Regression: RLS-hidden SAL expense ledger entry was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'La voce contabile è collegata a uno o più SAL%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.condominium_ledger_entries
    SET amount=501.00
    WHERE id='00000000-0000-0000-0000-000000000031';
    RAISE EXCEPTION 'Regression: RLS-hidden SAL payment ledger entry was modified';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'La voce contabile è collegata a ripartizioni, rate o SAL:%' THEN
      RAISE;
    END IF;
  END;
END; $hidden_sal_guard$;
RESET ROLE;
