-- Runtime regression: reject missing fiscal-year IDs and due dates outside
-- the assigned fiscal-year interval, while accepting a valid installment.
CREATE TABLE IF NOT EXISTS public.condominium_fiscal_years (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'Aperto'
);

ALTER TABLE public.condominium_fiscal_years
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Aperto';

UPDATE public.condominium_fiscal_years
SET start_date='2026-01-01', end_date='2026-12-31', status='Aperto'
WHERE id='00000000-0000-0000-0000-000000000081';
UPDATE public.condominium_fiscal_years
SET start_date='2027-01-01', end_date='2027-12-31', status='Aperto'
WHERE id='00000000-0000-0000-0000-000000000082';

\i supabase/migrations/20261124233000_validate_installment_fiscal_year_due_date.sql

DROP TRIGGER IF EXISTS validate_installment_fiscal_year_due_date_test
  ON public.condominium_installments;
CREATE TRIGGER validate_installment_fiscal_year_due_date_test
BEFORE INSERT OR UPDATE ON public.condominium_installments
FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_installment_scope();

DO $$
BEGIN
  BEGIN
    INSERT INTO public.condominium_installments
      (id,workspace_id,condominium_id,fiscal_year_id,amount,paid_amount,due_date)
    VALUES
      ('00000000-0000-0000-0000-000000000090',
       '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000080',
       NULL,10.00,0.00,'2026-12-01');
    RAISE EXCEPTION 'Regression: installment accepted without a fiscal year';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'L''esercizio contabile della rata è obbligatorio%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO public.condominium_installments
      (id,workspace_id,condominium_id,fiscal_year_id,amount,paid_amount,due_date)
    VALUES
      ('00000000-0000-0000-0000-000000000091',
       '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000080',
       '00000000-0000-0000-0000-000000000081',
       10.00,0.00,'2027-01-10');
    RAISE EXCEPTION 'Regression: installment due date outside its fiscal year was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'La scadenza della rata deve ricadere%' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.condominium_installments
    (id,workspace_id,condominium_id,fiscal_year_id,amount,paid_amount,due_date)
  VALUES
    ('00000000-0000-0000-0000-000000000092',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000080',
     '00000000-0000-0000-0000-000000000081',
     10.00,0.00,'2026-12-01');
END $$;
