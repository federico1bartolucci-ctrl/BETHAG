-- Preserve recipient UUIDs (and therefore provider idempotency keys) across retries.
-- Pending/failed recipients are reconciled in place; ambiguous queued outcomes fail closed.

CREATE OR REPLACE FUNCTION private.prepare_communication_recipients(p_communication_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_comm public.communications%rowtype;
  v_count integer;
  v_retry_count integer := 0;
  v_manual_review integer := 0;
  v_inactive_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  SELECT *
  INTO v_comm
  FROM public.communications
  WHERE id = p_communication_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;

  IF NOT private.can_manage_workspace_module(v_comm.workspace_id, 'comunicazioni') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Comunicazioni richiesta';
  END IF;

  IF v_comm.condominium_id IS NULL THEN
    RAISE EXCEPTION 'La comunicazione deve essere associata a un condominio per l''invio email';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = v_comm.condominium_id
      AND c.archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Il condominio è archiviato';
  END IF;

  -- Provider acceptance is stronger evidence than a stale local failure flag.
  -- Keep the original recipient ID and provider message ID.
  UPDATE public.communication_recipients r
  SET status = CASE
        WHEN r.bounced_at IS NOT NULL OR r.complained_at IS NOT NULL THEN 'failed'
        WHEN r.delivered_at IS NOT NULL THEN 'delivered'
        ELSE 'sent'
      END,
      queued_at = NULL,
      error_message = CASE
        WHEN r.bounced_at IS NOT NULL OR r.complained_at IS NOT NULL
          THEN COALESCE(NULLIF(BTRIM(r.error_message), ''), 'Il provider ha registrato un evento di mancata consegna.')
        ELSE NULL
      END,
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'failed'
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NOT NULL;

  -- Provider event/timestamp evidence without a message ID is ambiguous.
  -- Never put such a row back into the automatic send queue.
  UPDATE public.communication_recipients r
  SET status = 'skipped',
      queued_at = NULL,
      error_message = COALESCE(
        NULLIF(BTRIM(r.error_message), ''),
        'Storico provider incompleto: verifica manuale richiesta prima di un nuovo invio.'
      ),
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'failed'
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NULL
    AND (
      NULLIF(BTRIM(r.provider_event_id), '') IS NOT NULL
      OR NULLIF(BTRIM(r.event_type), '') IS NOT NULL
      OR r.sent_at IS NOT NULL
      OR r.delivered_at IS NOT NULL
      OR r.bounced_at IS NOT NULL
      OR r.complained_at IS NOT NULL
    );
  GET DIAGNOSTICS v_manual_review = ROW_COUNT;

  -- Retry only rows with no provider-acceptance evidence. Do not delete/reinsert:
  -- preserving id keeps the Resend Idempotency-Key stable.
  UPDATE public.communication_recipients r
  SET status = 'pending',
      queued_at = NULL,
      error_message = NULL,
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'failed'
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NULL
    AND NULLIF(BTRIM(r.provider_event_id), '') IS NULL
    AND NULLIF(BTRIM(r.event_type), '') IS NULL
    AND r.sent_at IS NULL
    AND r.delivered_at IS NULL
    AND r.bounced_at IS NULL
    AND r.complained_at IS NULL;
  GET DIAGNOSTICS v_retry_count = ROW_COUNT;

  -- Normalize inconsistent pending rows that already contain provider evidence.
  UPDATE public.communication_recipients r
  SET status = CASE
        WHEN r.bounced_at IS NOT NULL OR r.complained_at IS NOT NULL THEN 'failed'
        WHEN r.delivered_at IS NOT NULL THEN 'delivered'
        ELSE 'sent'
      END,
      queued_at = NULL,
      error_message = CASE
        WHEN r.bounced_at IS NOT NULL OR r.complained_at IS NOT NULL
          THEN COALESCE(NULLIF(BTRIM(r.error_message), ''), 'Il provider ha registrato un evento di mancata consegna.')
        ELSE NULL
      END,
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'pending'
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NOT NULL;

  UPDATE public.communication_recipients r
  SET status = 'skipped',
      queued_at = NULL,
      error_message = COALESCE(
        NULLIF(BTRIM(r.error_message), ''),
        'Storico provider incompleto: verifica manuale richiesta prima di un nuovo invio.'
      ),
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'pending'
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NULL
    AND (
      NULLIF(BTRIM(r.provider_event_id), '') IS NOT NULL
      OR NULLIF(BTRIM(r.event_type), '') IS NOT NULL
      OR r.sent_at IS NOT NULL
      OR r.delivered_at IS NOT NULL
      OR r.bounced_at IS NOT NULL
      OR r.complained_at IS NOT NULL
    );
  GET DIAGNOSTICS v_manual_review = v_manual_review + ROW_COUNT;

  -- Keep the historical row, but do not send to a pending address that is no
  -- longer represented by an active member of this condominium.
  UPDATE public.communication_recipients r
  SET status = 'skipped',
      queued_at = NULL,
      error_message = 'Destinatario non più attivo nel condominio: invio escluso dalla preparazione.',
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.condominium_members m
      WHERE m.condominium_id = v_comm.condominium_id
        AND m.active = true
        AND NULLIF(BTRIM(m.email), '') IS NOT NULL
        AND LOWER(BTRIM(m.email)) = LOWER(BTRIM(r.email))
    );
  GET DIAGNOSTICS v_inactive_count = ROW_COUNT;

  INSERT INTO public.communication_recipients (
    communication_id,
    workspace_id,
    condominium_id,
    member_id,
    user_id,
    email,
    name,
    recipient_role,
    status
  )
  SELECT
    v_comm.id,
    v_comm.workspace_id,
    m.condominium_id,
    m.id,
    m.user_id,
    LOWER(BTRIM(m.email)),
    m.name,
    CASE
      WHEN COALESCE(m.data->>'role', m.role) = 'Proprietario' THEN 'owner'
      WHEN COALESCE(m.data->>'role', m.role) = 'Inquilino' THEN 'tenant'
      WHEN m.role = 'council' THEN 'council'
      ELSE 'resident'
    END,
    'pending'
  FROM public.condominium_members m
  WHERE m.condominium_id = v_comm.condominium_id
    AND m.active = true
    AND NULLIF(BTRIM(m.email), '') IS NOT NULL
  ON CONFLICT (communication_id, LOWER(BTRIM(email))) DO UPDATE
  SET member_id = EXCLUDED.member_id,
      user_id = EXCLUDED.user_id,
      name = EXCLUDED.name,
      recipient_role = EXCLUDED.recipient_role,
      updated_at = now();

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public.communication_recipients
  WHERE communication_id = p_communication_id
    AND status = 'pending';

  UPDATE public.communications
  SET email_status = CASE WHEN v_count > 0 THEN 'prepared' ELSE 'no_recipients' END,
      email_prepared_at = CASE WHEN v_count > 0 THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_communication_id;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_count > 0 THEN 'prepared' ELSE 'no_recipients' END,
    'recipient_count', v_count,
    'retried_failed', v_retry_count,
    'manual_review', v_manual_review,
    'excluded_inactive', v_inactive_count
  );
END;
$function$;

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
  v_count integer := 0;
  v_resolved integer := 0;
  v_manual_review integer := 0;
  v_workspace_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;
  IF p_communication_id IS NULL THEN
    RAISE EXCEPTION 'La comunicazione è obbligatoria';
  END IF;
  IF p_age IS NULL OR p_age < interval '5 minutes' THEN
    RAISE EXCEPTION 'Intervallo di recupero troppo breve';
  END IF;

  SELECT c.workspace_id
  INTO v_workspace_id
  FROM public.communications c
  WHERE c.id = p_communication_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;
  IF NOT private.can_manage_workspace_module(v_workspace_id, 'comunicazioni') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Comunicazioni richiesta';
  END IF;

  -- If the provider message ID exists, the send was accepted. Resolve the
  -- stale queue row without making it sendable again.
  UPDATE public.communication_recipients r
  SET status = CASE
        WHEN r.bounced_at IS NOT NULL OR r.complained_at IS NOT NULL THEN 'failed'
        WHEN r.delivered_at IS NOT NULL THEN 'delivered'
        ELSE 'sent'
      END,
      queued_at = NULL,
      error_message = CASE
        WHEN r.bounced_at IS NOT NULL OR r.complained_at IS NOT NULL
          THEN COALESCE(NULLIF(BTRIM(r.error_message), ''), 'Il provider ha registrato un evento di mancata consegna.')
        ELSE NULL
      END,
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'queued'
    AND r.queued_at IS NOT NULL
    AND r.queued_at < now() - p_age
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NOT NULL;
  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  -- A stale queued row without provider acceptance evidence is ambiguous:
  -- do not automatically resend it. Preserve the ID and require review.
  UPDATE public.communication_recipients r
  SET status = 'skipped',
      queued_at = NULL,
      error_message = COALESCE(
        NULLIF(BTRIM(r.error_message), ''),
        'Invio interrotto con esito provider non verificabile: verifica manuale richiesta prima di un nuovo invio.'
      ),
      updated_at = now()
  WHERE r.communication_id = p_communication_id
    AND r.status = 'queued'
    AND r.queued_at IS NOT NULL
    AND r.queued_at < now() - p_age
    AND NULLIF(BTRIM(r.provider_message_id), '') IS NULL;
  GET DIAGNOSTICS v_manual_review = ROW_COUNT;

  v_count := v_resolved + v_manual_review;
  RETURN jsonb_build_object(
    'reset', v_count,
    'resolved_provider_acceptance', v_resolved,
    'manual_review', v_manual_review
  );
END;
$function$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) FROM PUBLIC, anon;
