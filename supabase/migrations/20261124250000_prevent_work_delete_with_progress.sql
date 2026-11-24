-- A work row must not cascade-delete its SAL records.
-- SALs carry accounting links and payment evidence; the work's ON DELETE
-- CASCADE FK would otherwise remove them before the ledger integrity guard
-- can protect their references.
CREATE OR REPLACE FUNCTION public.prevent_work_delete_with_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO off
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.condominium_work_progress p
    WHERE p.id IS NOT NULL
      AND p.work_id = OLD.id
      AND p.workspace_id = OLD.workspace_id
      AND p.condominium_id = OLD.condominium_id
  ) THEN
    RAISE EXCEPTION 'Il lavoro ha SAL registrati e non può essere eliminato; archiviare il lavoro per conservarne la storia contabile';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_work_delete_with_progress
  ON public.condominium_works;

CREATE TRIGGER trg_prevent_work_delete_with_progress
BEFORE DELETE ON public.condominium_works
FOR EACH ROW
EXECUTE FUNCTION public.prevent_work_delete_with_progress();
