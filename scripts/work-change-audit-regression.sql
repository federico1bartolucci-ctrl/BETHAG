-- Runtime regression: one UPDATE changing multiple work dimensions must
-- generate an audit record for each changed dimension.
CREATE TABLE IF NOT EXISTS public.condominium_works (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  estimated_amount numeric NOT NULL DEFAULT 0,
  approved_amount numeric NOT NULL DEFAULT 0,
  supplier_id uuid,
  start_date date,
  expected_end_date date,
  actual_end_date date
);

ALTER TABLE public.condominium_works
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normale',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fund_id uuid,
  ADD COLUMN IF NOT EXISTS register_item_id uuid;

\i supabase/rebuild/candidates/accounting-point1-20261124/20261124240000_audit_work_details_and_references.sql

DROP TRIGGER IF EXISTS audit_condominium_work_change_test
  ON public.condominium_works;
CREATE TRIGGER audit_condominium_work_change_test
AFTER INSERT OR DELETE OR UPDATE ON public.condominium_works
FOR EACH ROW EXECUTE FUNCTION public.audit_condominium_work_change();

INSERT INTO public.condominium_works
  (id, workspace_id, condominium_id, title, status, estimated_amount, approved_amount)
VALUES
  ('00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'Lavoro test audit', 'Da programmare', 1000.00, 900.00);

DELETE FROM public.condominium_audit_log
WHERE entity_id='00000000-0000-0000-0000-000000000050';

UPDATE public.condominium_works
SET status='In corso',
    estimated_amount=1200.00,
    approved_amount=1100.00,
    supplier_id='00000000-0000-0000-0000-000000000060',
    start_date=current_date,
    expected_end_date=current_date + 30,
    actual_end_date=current_date + 25
WHERE id='00000000-0000-0000-0000-000000000050';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.condominium_audit_log
      WHERE entity_id='00000000-0000-0000-0000-000000000050'
        AND action IN ('work_status_changed','work_budget_changed','work_supplier_changed','work_dates_changed')) <> 4 THEN
    RAISE EXCEPTION 'Regression: combined work update did not generate all four audit events';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_audit_log
    WHERE entity_id='00000000-0000-0000-0000-000000000050'
      AND action='work_budget_changed'
      AND data->>'old_estimated_amount'='1000.00'
      AND data->>'new_estimated_amount'='1200.00'
  ) THEN
    RAISE EXCEPTION 'Regression: budget changes were omitted from combined work update audit';
  END IF;
END $$;
