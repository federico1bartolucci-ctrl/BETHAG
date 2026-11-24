-- Runtime regression: moving an unpaid installment must refresh both ledger parents.
ALTER TABLE public.condominium_ledger_entries
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Registrato';

CREATE TABLE IF NOT EXISTS public.condominium_installments (
  id uuid PRIMARY KEY,
  ledger_entry_id uuid,
  amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL
);

INSERT INTO public.condominium_ledger_entries (id, workspace_id, condominium_id, fiscal_year_id, direction, amount, payment_status)
VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000005',
   'Uscita', 100.00, 'Registrato'),
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000005',
   'Uscita', 100.00, 'Registrato');

INSERT INTO public.condominium_installments (id, ledger_entry_id, amount, paid_amount, due_date)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000010',
  100.00, 0.00, current_date + 30
);

DO $$
BEGIN
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='00000000-0000-0000-0000-000000000010') <> 'Da pagare' THEN
    RAISE EXCEPTION 'Setup failed: source ledger should be Da pagare';
  END IF;
END $$;

UPDATE public.condominium_installments
SET ledger_entry_id='00000000-0000-0000-0000-000000000011'
WHERE id='00000000-0000-0000-0000-000000000012';

DO $$
BEGIN
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='00000000-0000-0000-0000-000000000010') <> 'Registrato' THEN
    RAISE EXCEPTION 'Regression: former ledger status was not recalculated';
  END IF;
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='00000000-0000-0000-0000-000000000011') <> 'Da pagare' THEN
    RAISE EXCEPTION 'Regression: destination ledger status was not recalculated';
  END IF;
END $$;

UPDATE public.condominium_installments
SET ledger_entry_id=NULL
WHERE id='00000000-0000-0000-0000-000000000012';

DO $$
BEGIN
  IF (SELECT payment_status FROM public.condominium_ledger_entries
      WHERE id='00000000-0000-0000-0000-000000000011') <> 'Registrato' THEN
    RAISE EXCEPTION 'Regression: ledger status was not recalculated when installment was unlinked';
  END IF;
END $$;
