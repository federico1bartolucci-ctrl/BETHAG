-- Keep the closing-member installment guard case-insensitive, matching
-- preserve_closing_condominium_member_history().
CREATE OR REPLACE FUNCTION private.prevent_new_installment_for_closing_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.member_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.condominium_members cm
       WHERE cm.id = NEW.member_id
         AND cm.active
         AND lower(trim(coalesce(cm.data->>'position_status', ''))) = 'in chiusura'
     )
  THEN
    RAISE EXCEPTION 'MEMBER_POSITION_CLOSING: il titolare è in chiusura e non può ricevere nuove rate';
  END IF;

  RETURN NEW;
END;
$function$;
