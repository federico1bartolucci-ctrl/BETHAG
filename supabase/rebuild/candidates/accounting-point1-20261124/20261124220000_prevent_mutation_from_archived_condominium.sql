-- An UPDATE must not escape an archived condominium by changing the
-- row's condominium_id to an active condominium.
CREATE OR REPLACE FUNCTION public.prevent_archived_condominium_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_condominium_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_condominium_id := OLD.condominium_id;
    IF v_condominium_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.condominiums c
         WHERE c.id = v_condominium_id
           AND c.archived_at IS NOT NULL
       ) THEN
      RAISE EXCEPTION 'Il condominio di origine è archiviato: modifica non consentita';
    END IF;
  END IF;

  v_condominium_id := NEW.condominium_id;
  IF v_condominium_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.condominiums c
       WHERE c.id = v_condominium_id
         AND c.archived_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Il condominio è archiviato: modifica non consentita';
  END IF;

  RETURN NEW;
END;
$function$;
