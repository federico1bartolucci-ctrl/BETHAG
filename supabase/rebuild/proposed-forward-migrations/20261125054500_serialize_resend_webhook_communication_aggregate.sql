-- Serialize webhook events per communication before changing recipient rows.
-- This prevents concurrent events for different recipients from persisting an
-- aggregate computed from mutually stale READ COMMITTED snapshots.
CREATE OR REPLACE FUNCTION private.apply_resend_communication_event(
  p_provider_message_id text,
  p_event_id text,
  p_event_type text,
  p_email text,
  p_event_at timestamp with time zone DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_row public.communication_recipients%rowtype;
  v_status text;
  v_comm uuid;
  v_counts jsonb;
  v_event_at timestamptz := coalesce(p_event_at, now());
  v_status_event boolean;
BEGIN
  IF nullif(trim(p_provider_message_id), '') IS NULL
     OR nullif(trim(p_event_type), '') IS NULL THEN
    RAISE EXCEPTION 'Evento Resend incompleto';
  END IF;

  -- Lock order is communication first, recipient second. All events for one
  -- communication therefore serialize before any recipient mutation or aggregate
  -- snapshot, and this matches prepare_communication_recipients' parent-first order.
  SELECT r.communication_id
    INTO v_comm
  FROM public.communication_recipients r
  WHERE r.provider_message_id = p_provider_message_id
    AND (p_email IS NULL OR lower(trim(r.email)) = lower(trim(p_email)))
  ORDER BY r.id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'recipient_not_found');
  END IF;

  PERFORM 1
  FROM public.communications c
  WHERE c.id = v_comm
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'communication_not_found');
  END IF;

  SELECT r.* INTO v_row
  FROM public.communication_recipients r
  WHERE r.provider_message_id = p_provider_message_id
    AND r.communication_id = v_comm
    AND (p_email IS NULL OR lower(trim(r.email)) = lower(trim(p_email)))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'recipient_not_found');
  END IF;

  -- "email.sent" only changes delivery state while a recipient is queued.
  -- Opens/clicks and other informational events do not advance this cursor.
  v_status_event := p_event_type IN ('email.sent', 'email.delivered', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed')
    AND (p_event_type <> 'email.sent' OR v_row.status = 'queued');

  IF v_status_event THEN
    IF p_event_id IS NOT NULL AND p_event_id = v_row.provider_status_event_id THEN
      RETURN jsonb_build_object(
        'status', 'ignored',
        'reason', 'duplicate_status_event',
        'current_status', v_row.status
      );
    END IF;

    IF v_row.provider_status_event_at IS NOT NULL
       AND (
         v_event_at < v_row.provider_status_event_at
         OR (
           v_event_at = v_row.provider_status_event_at
           AND CASE v_row.status
             WHEN 'failed' THEN 3
             WHEN 'delivered' THEN 2
             WHEN 'sent' THEN 1
             ELSE 0
           END >= CASE p_event_type
             WHEN 'email.complained' THEN 3
             WHEN 'email.bounced' THEN 3
             WHEN 'email.failed' THEN 3
             WHEN 'email.suppressed' THEN 3
             WHEN 'email.delivered' THEN 2
             WHEN 'email.sent' THEN 1
             ELSE 0
           END
         )
       ) THEN
      RETURN jsonb_build_object(
        'status', 'ignored',
        'reason', 'stale_status_event',
        'current_status', v_row.status
      );
    END IF;
  END IF;

  v_status := CASE p_event_type
    WHEN 'email.delivered' THEN 'delivered'
    WHEN 'email.bounced' THEN 'failed'
    WHEN 'email.complained' THEN 'failed'
    WHEN 'email.failed' THEN 'failed'
    WHEN 'email.suppressed' THEN 'failed'
    WHEN 'email.sent' THEN CASE WHEN v_row.status = 'queued' THEN 'sent' ELSE v_row.status END
    ELSE v_row.status
  END;

  UPDATE public.communication_recipients
  SET status = v_status,
      event_type = p_event_type,
      provider_event_id = coalesce(p_event_id, provider_event_id),
      provider_status_event_at = CASE WHEN v_status_event THEN v_event_at ELSE provider_status_event_at END,
      provider_status_event_id = CASE WHEN v_status_event THEN coalesce(p_event_id, provider_status_event_id) ELSE provider_status_event_id END,
      delivered_at = CASE WHEN p_event_type = 'email.delivered' THEN v_event_at ELSE delivered_at END,
      bounced_at = CASE WHEN p_event_type = 'email.bounced' THEN v_event_at ELSE bounced_at END,
      complained_at = CASE WHEN p_event_type = 'email.complained' THEN v_event_at ELSE complained_at END,
      error_message = CASE
        WHEN p_event_type = 'email.bounced' THEN 'email.bounced'
        WHEN p_event_type = 'email.complained' THEN 'email.complained'
        WHEN p_event_type = 'email.failed' THEN 'email.failed'
        WHEN p_event_type = 'email.suppressed' THEN 'email.suppressed'
        WHEN p_event_type = 'email.delivered' THEN NULL
        ELSE error_message
      END,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING communication_id INTO v_comm;

  SELECT jsonb_build_object(
    'pending', count(*) FILTER (WHERE status IN ('pending', 'queued')),
    'sent', count(*) FILTER (WHERE status = 'sent'),
    'delivered', count(*) FILTER (WHERE status = 'delivered'),
    'failed', count(*) FILTER (WHERE status = 'failed')
  ) INTO v_counts
  FROM public.communication_recipients
  WHERE communication_id = v_comm;

  UPDATE public.communications
  SET email_status = CASE
    WHEN (v_counts ->> 'pending')::int > 0 THEN 'In elaborazione'
    WHEN (v_counts ->> 'failed')::int > 0
      AND ((v_counts ->> 'sent')::int + (v_counts ->> 'delivered')::int) > 0 THEN 'Parzialmente inviata'
    WHEN (v_counts ->> 'failed')::int > 0 THEN 'Errore'
    WHEN (v_counts ->> 'delivered')::int > 0 AND (v_counts ->> 'sent')::int = 0 THEN 'Consegnata'
    WHEN (v_counts ->> 'sent')::int > 0 THEN 'Inviata'
    ELSE email_status
  END,
  updated_at = now()
  WHERE id = v_comm;

  RETURN jsonb_build_object(
    'status', 'updated',
    'communication_id', v_comm,
    'counts', v_counts
  );
END;
$function$;
