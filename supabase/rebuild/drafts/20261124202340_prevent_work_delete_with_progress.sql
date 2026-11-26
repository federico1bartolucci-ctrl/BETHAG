-- Preserve accounting evidence before the ON DELETE CASCADE on work_progress.work_id fires.
-- Child workspace_id and condominium_id have independent FKs and are not part
-- of the work_id relationship, so they must never narrow this existence check.
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
    WHERE p.work_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Il lavoro ha SAL collegati e non può essere eliminato; archiviare il lavoro per conservarne la storia contabile';
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

-- Trigger-only SECURITY DEFINER helper: API roles do not need direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.prevent_work_delete_with_progress()
  FROM PUBLIC, anon, authenticated, service_role;
