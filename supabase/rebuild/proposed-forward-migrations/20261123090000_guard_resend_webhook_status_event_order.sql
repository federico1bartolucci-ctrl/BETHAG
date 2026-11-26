-- Preserve the latest provider delivery-state event so delayed/replayed webhook
-- events cannot regress a recipient's final status.
ALTER TABLE public.communication_recipients
  ADD COLUMN IF NOT EXISTS provider_status_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_status_event_id text;

-- Backfill a status-event cursor for rows that already have a delivery outcome.
UPDATE public.communication_recipients
SET provider_status_event_at = greatest(delivered_at, bounced_at, complained_at)
WHERE provider_status_event_at IS NULL
  AND (delivered_at IS NOT NULL OR bounced_at IS NOT NULL OR complained_at IS NOT NULL);

UPDATE public.communication_recipients
SET provider_status_event_id = provider_event_id
WHERE provider_status_event_id IS NULL
  AND provider_event_id IS NOT NULL
  AND event_type IN ('email.sent', 'email.delivered', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed');

-- The previous handler stored email.failed/email.suppressed as event metadata
-- without changing queued/sent recipients. Repair those rows without ever
-- downgrading a recipient already marked delivered.
UPDATE public.communication_recipients
SET status = CASE
      WHEN status IN ('pending', 'queued', 'sent') THEN 'failed'
      ELSE status
    END,
    error_message = CASE
      WHEN status IN ('pending', 'queued', 'sent') THEN event_type
      ELSE error_message
    END,
    provider_status_event_at = greatest(coalesce(provider_status_event_at, updated_at), updated_at),
    provider_status_event_id = provider_event_id
WHERE event_type IN ('email.failed', 'email.suppressed')
  AND provider_event_id IS NOT NULL;

-- Recompute only communications touched by the repair so the aggregate status
-- no longer remains "In elaborazione" for terminal provider failures.
WITH affected AS (
  SELECT DISTINCT communication_id
  FROM public.communication_recipients
  WHERE event_type IN ('email.failed', 'email.suppressed')
    AND provider_event_id IS NOT NULL
),
counts AS (
  SELECT r.communication_id,
         count(*) FILTER (WHERE r.status IN ('pending', 'queued')) AS pending,
         count(*) FILTER (WHERE r.status = 'sent') AS sent,
         count(*) FILTER (WHERE r.status = 'delivered') AS delivered,
         count(*) FILTER (WHERE r.status = 'failed') AS failed
  FROM public.communication_recipients r
  JOIN affected a ON a.communication_id = r.communication_id
  GROUP BY r.communication_id
)
UPDATE public.communications c
SET email_status = CASE
      WHEN counts.pending > 0 THEN 'In elaborazione'
      WHEN counts.failed > 0 AND (counts.sent + counts.delivered) > 0 THEN 'Parzialmente inviata'
      WHEN counts.failed > 0 THEN 'Errore'
      WHEN counts.delivered > 0 AND counts.sent = 0 THEN 'Consegnata'
      WHEN counts.sent > 0 THEN 'Inviata'
      ELSE c.email_status
    END,
    updated_at = now()
FROM counts
WHERE c.id = counts.communication_id;

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

  SELECT * INTO v_row
  FROM public.communication_recipients
  WHERE provider_message_id = p_provider_message_id
    AND (p_email IS NULL OR lower(trim(email)) = lower(trim(p_email)))
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
