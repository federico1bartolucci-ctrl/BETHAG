-- Runtime regression: a ledger-linked installment cannot be assigned to
-- a different fiscal year, even when workspace and condominium match.
ALTER TABLE public.condominium_installments
  ADD COLUMN IF NOT EXISTS fiscal_year_id uuid,
  ADD COLUMN IF NOT EXISTS unit_id uuid;
ALTER TABLE public.condominium_members
  ADD COLUMN IF NOT EXISTS condominium_id uuid;

CREATE TABLE IF NOT EXISTS public.condominium_units (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS public.condominium_fiscal_years (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  condominium_id uuid NOT NULL
);

INSERT INTO public.condominiums(id, archived_at) VALUES
 ('00000000-0000-0000-0000-000000000080', NULL)
ON CONFLICT (id) DO UPDATE SET archived_at=NULL;

INSERT INTO public.condominium_fiscal_years(id,workspace_id,condominium_id) VALUES
 ('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000080'),
 ('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000080')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.condominium_units(id,workspace_id,condominium_id) VALUES
 ('00000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000080')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.condominium_ledger_entries
  (id,workspace_id,condominium_id,fiscal_year_id,direction,amount,payment_status,due_date)
VALUES
 ('00000000-0000-0000-0000-000000000084','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000080','00000000-0000-0000-0000-000000000081','Uscita',250.00,'Registrato',current_date)
ON CONFLICT (id) DO NOTHING;

\i supabase/migrations/20261124230000_validate_installment_ledger_fiscal_year.sql

DROP TRIGGER IF EXISTS validate_installment_scope_fiscal_year_test
  ON public.condominium_installments;
CREATE TRIGGER validate_installment_scope_fiscal_year_test
BEFORE INSERT OR UPDATE ON public.condominium_installments
FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_installment_scope();

DO $$
BEGIN
  BEGIN
    INSERT INTO public.condominium_installments
      (id,workspace_id,condominium_id,ledger_entry_id,fiscal_year_id,unit_id,amount,paid_amount,due_date)
    VALUES
      ('00000000-0000-0000-0000-000000000085',
       '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000080',
       '00000000-0000-0000-0000-000000000084',
       '00000000-0000-0000-0000-000000000082',
       '00000000-0000-0000-0000-000000000083',
       250.00,0.00,current_date + 30);
    RAISE EXCEPTION 'Regression: installment accepted with a different fiscal year from its ledger';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'L''esercizio della rata deve coincidere%' THEN
      RAISE;
    END IF;
  END;

  INSERT INTO public.condominium_installments
    (id,workspace_id,condominium_id,ledger_entry_id,fiscal_year_id,unit_id,amount,paid_amount,due_date)
  VALUES
    ('00000000-0000-0000-0000-000000000086',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000080',
     '00000000-0000-0000-0000-000000000084',
     '00000000-0000-0000-0000-000000000081',
     '00000000-0000-0000-0000-000000000083',
     250.00,0.00,current_date + 30);
END $$;
