-- Server-authoritative entitlement for Plus communications.
-- Delivery-status writes remain possible after a downgrade so in-flight sends and
-- provider webhooks can finalize their ledger; content, publication and recipient
-- preparation require Plus, Professional or Portal.

CREATE OR REPLACE FUNCTION private.workspace_has_plus_plan(target_workspace uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = target_workspace
      AND lower(trim(coalesce(w.plan, ''))) IN ('plus', 'professional', 'portal')
  );
$function$;

REVOKE ALL ON FUNCTION private.workspace_has_plus_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_has_plus_plan(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION private.workspace_has_plus_plan(uuid)
IS 'Returns whether a workspace has Plus or higher server-managed entitlement for communications.';

CREATE OR REPLACE FUNCTION private.guard_communications_plan_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_content_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT private.workspace_has_plus_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'COMMUNICATIONS_PLAN_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  v_content_changed :=
       NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.condominium_id IS DISTINCT FROM OLD.condominium_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.data IS DISTINCT FROM OLD.data
    OR NEW.legacy_id IS DISTINCT FROM OLD.legacy_id
    OR (NEW.published IS DISTINCT FROM OLD.published AND NEW.published = true);

  -- Unpublishing and delivery-status updates remain available after downgrade.
  IF v_content_changed THEN
    IF NOT private.workspace_has_plus_plan(OLD.workspace_id)
       OR NOT private.workspace_has_plus_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'COMMUNICATIONS_PLAN_REQUIRED';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_communications_plan_entitlement()
FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_guard_communications_plan_entitlement
ON public.communications;
CREATE TRIGGER trg_guard_communications_plan_entitlement
BEFORE INSERT OR UPDATE ON public.communications
FOR EACH ROW
EXECUTE FUNCTION private.guard_communications_plan_entitlement();

CREATE OR REPLACE FUNCTION private.guard_communication_recipient_plan_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_identity_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT private.workspace_has_plus_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'COMMUNICATIONS_PLAN_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  v_identity_changed :=
       NEW.communication_id IS DISTINCT FROM OLD.communication_id
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.condominium_id IS DISTINCT FROM OLD.condominium_id
    OR NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.recipient_role IS DISTINCT FROM OLD.recipient_role;

  -- Status/provider fields may be finalized after downgrade by an in-flight send
  -- or a Resend webhook. Recipient identity and membership remain plan-gated.
  IF v_identity_changed THEN
    IF NOT private.workspace_has_plus_plan(OLD.workspace_id)
       OR NOT private.workspace_has_plus_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'COMMUNICATIONS_PLAN_REQUIRED';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_communication_recipient_plan_entitlement()
FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_guard_communication_recipient_plan_entitlement
ON public.communication_recipients;
CREATE TRIGGER trg_guard_communication_recipient_plan_entitlement
BEFORE INSERT OR UPDATE ON public.communication_recipients
FOR EACH ROW
EXECUTE FUNCTION private.guard_communication_recipient_plan_entitlement();

CREATE OR REPLACE FUNCTION private.prepare_communication_recipients(p_communication_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_comm public.communications%rowtype;
  v_count int;
  v_retry_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  SELECT * INTO v_comm
  FROM public.communications
  WHERE id = p_communication_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;

  IF NOT private.can_manage_workspace_module(v_comm.workspace_id, 'comunicazioni') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Comunicazioni richiesta';
  END IF;

  IF NOT private.workspace_has_plus_plan(v_comm.workspace_id) THEN
    RAISE EXCEPTION 'COMMUNICATIONS_PLAN_REQUIRED';
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

  UPDATE public.communication_recipients
  SET status = 'pending',
      provider_message_id = NULL,
      provider_event_id = NULL,
      sent_at = NULL,
      delivered_at = NULL,
      bounced_at = NULL,
      complained_at = NULL,
      queued_at = NULL,
      event_type = NULL,
      error_message = NULL,
      updated_at = now()
  WHERE communication_id = p_communication_id
    AND status = 'failed';

  GET DIAGNOSTICS v_retry_count = ROW_COUNT;

  DELETE FROM public.communication_recipients
  WHERE communication_id = p_communication_id
    AND status = 'pending';

  INSERT INTO public.communication_recipients (
    communication_id, workspace_id, condominium_id, member_id, user_id,
    email, name, recipient_role, status
  )
  SELECT
    v_comm.id, v_comm.workspace_id, m.condominium_id, m.id, m.user_id,
    lower(trim(m.email)), m.name,
    CASE
      WHEN coalesce(m.data->>'role', m.role) = 'Proprietario' THEN 'owner'
      WHEN coalesce(m.data->>'role', m.role) = 'Inquilino' THEN 'tenant'
      WHEN m.role = 'council' THEN 'council'
      ELSE 'resident'
    END,
    'pending'
  FROM public.condominium_members m
  WHERE m.condominium_id = v_comm.condominium_id
    AND m.active = true
    AND nullif(trim(m.email), '') IS NOT NULL
  ON CONFLICT (communication_id, lower(btrim(email))) DO UPDATE SET
    member_id = excluded.member_id,
    user_id = excluded.user_id,
    name = excluded.name,
    recipient_role = excluded.recipient_role,
    updated_at = now();

  SELECT count(*) INTO v_count
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
    'retried_failed', v_retry_count
  );
END;
$function$;

COMMENT ON FUNCTION private.prepare_communication_recipients(uuid)
IS 'Prepares communication recipients only for workspaces with a server-managed Plus-or-higher plan.';

CREATE OR REPLACE FUNCTION public.reset_stale_communication_recipients(
  p_communication_id uuid,
  p_age interval DEFAULT '00:15:00'::interval
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_ws uuid;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF p_age < interval '5 minutes' THEN
    RAISE EXCEPTION 'Intervallo di recupero troppo breve';
  END IF;

  SELECT workspace_id INTO v_ws
  FROM public.communications
  WHERE id = p_communication_id
    AND condominium_id IS NOT NULL;

  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;

  IF NOT private.can_manage_workspace_module(v_ws, 'comunicazioni') THEN
    RAISE EXCEPTION 'Permessi insufficienti';
  END IF;

  IF NOT private.workspace_has_plus_plan(v_ws) THEN
    RAISE EXCEPTION 'COMMUNICATIONS_PLAN_REQUIRED';
  END IF;

  UPDATE public.communication_recipients
  SET status = 'pending',
      queued_at = NULL,
      error_message = NULL,
      updated_at = now()
  WHERE communication_id = p_communication_id
    AND status = 'queued'
    AND queued_at IS NOT NULL
    AND queued_at < now() - p_age;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('reset', v_count);
END;
$function$;

COMMENT ON FUNCTION public.reset_stale_communication_recipients(uuid, interval)
IS 'Resets stale queued recipients only when the workspace has a server-managed Plus-or-higher plan.';
