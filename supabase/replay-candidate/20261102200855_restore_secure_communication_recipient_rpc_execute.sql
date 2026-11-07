GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.reset_stale_communication_recipients(
  p_communication_id uuid DEFAULT NULL,
  p_age interval DEFAULT interval '15 minutes'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
  v_workspace_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;
  IF p_communication_id IS NULL THEN
    RAISE EXCEPTION 'La comunicazione è obbligatoria';
  END IF;
  IF p_age < interval '5 minutes' THEN
    RAISE EXCEPTION 'Intervallo di recupero troppo breve';
  END IF;
  SELECT c.workspace_id INTO v_workspace_id
  FROM public.communications c WHERE c.id = p_communication_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comunicazione non trovata'; END IF;
  IF NOT private.can_manage_workspace_module(v_workspace_id, 'comunicazioni') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Comunicazioni richiesta';
  END IF;
  UPDATE public.communication_recipients
  SET status = 'pending', queued_at = NULL, error_message = NULL, updated_at = now()
  WHERE communication_id = p_communication_id AND status = 'queued'
    AND queued_at IS NOT NULL AND queued_at < now() - p_age;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('reset', v_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) FROM PUBLIC, anon;