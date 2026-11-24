-- Runtime regression: rows belonging to an archived condominium cannot
-- be moved to an active condominium to bypass the archive mutation guard.
CREATE TABLE IF NOT EXISTS public.condominiums (
  id uuid PRIMARY KEY,
  archived_at timestamptz
);

INSERT INTO public.condominiums(id, archived_at) VALUES
 ('00000000-0000-0000-0000-000000000070', now()),
 ('00000000-0000-0000-0000-000000000071', NULL)
ON CONFLICT (id) DO UPDATE SET archived_at=EXCLUDED.archived_at;

INSERT INTO public.condominium_works
  (id, workspace_id, condominium_id, title, status, estimated_amount, approved_amount)
VALUES
 ('00000000-0000-0000-0000-000000000072',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000070',
  'Archived work guard test', 'Da programmare', 0, 0)
ON CONFLICT (id) DO UPDATE SET condominium_id=EXCLUDED.condominium_id;

\i supabase/rebuild/candidates/accounting-point1-20261124/20261124220000_prevent_mutation_from_archived_condominium.sql

DROP TRIGGER IF EXISTS prevent_archived_condominium_mutation_test
  ON public.condominium_works;
CREATE TRIGGER prevent_archived_condominium_mutation_test
BEFORE INSERT OR UPDATE ON public.condominium_works
FOR EACH ROW EXECUTE FUNCTION public.prevent_archived_condominium_mutation();

DO $$
BEGIN
  BEGIN
    UPDATE public.condominium_works
    SET condominium_id='00000000-0000-0000-0000-000000000071'
    WHERE id='00000000-0000-0000-0000-000000000072';
    RAISE EXCEPTION 'Regression: archived work was moved to an active condominium';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il condominio di origine è archiviato:%' THEN
      RAISE;
    END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_works
    WHERE id='00000000-0000-0000-0000-000000000072'
      AND condominium_id='00000000-0000-0000-0000-000000000070'
  ) THEN
    RAISE EXCEPTION 'Regression: archived work changed condominium despite guard';
  END IF;
END $$;
