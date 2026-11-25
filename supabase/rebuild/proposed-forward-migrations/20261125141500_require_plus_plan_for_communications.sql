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

CREATE OR REPLACE FUNCTION public.prepare_communication_recipients(p_communication_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_workspace_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  SELECT workspace_id
  INTO v_workspace_id
  FROM public.communications
  WHERE id = p_communication_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;

  IF NOT private.can_manage_workspace_module(v_workspace_id, 'comunicazioni') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Comunicazioni richiesta';
  END IF;

  IF NOT private.workspace_has_plus_plan(v_workspace_id) THEN
    RAISE EXCEPTION 'COMMUNICATIONS_PLAN_REQUIRED';
  END IF;

  -- Delegate to the private implementation without replacing it. This keeps
  -- independent recipient-retry/idempotency hardening composable.
  RETURN private.prepare_communication_recipients(p_communication_id);
END;
$function$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(uuid) TO authenticated;

COMMENT ON FUNCTION public.prepare_communication_recipients(uuid)
IS 'Authorizes recipient preparation only for server-managed Plus-or-higher workspaces, then delegates to the private implementation.';

CREATE OR REPLACE FUNCTION public.reset_stale_communication_recipients(
  p_communication_id uuid,
  p_age interval DEFAULT '00:15:00'::interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_workspace_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF p_age IS NULL OR p_age < interval '5 minutes' THEN
    RAISE EXCEPTION 'Intervallo di recupero troppo breve';
  END IF;

  SELECT workspace_id
  INTO v_workspace_id
  FROM public.communications
  WHERE id = p_communication_id
    AND condominium_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;

  IF NOT private.can_manage_workspace_module(v_workspace_id, 'comunicazioni') THEN
    RAISE EXCEPTION 'Permessi insufficienti';
  END IF;

  IF NOT private.workspace_has_plus_plan(v_workspace_id) THEN
    RAISE EXCEPTION 'COMMUNICATIONS_PLAN_REQUIRED';
  END IF;

  -- Delegate to the private implementation so its provider/idempotency safeguards
  -- remain intact when the independent retry-hardening candidate is integrated.
  RETURN private.reset_stale_communication_recipients(p_communication_id, p_age);
END;
$function$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_stale_communication_recipients(uuid, interval) TO authenticated;

COMMENT ON FUNCTION public.reset_stale_communication_recipients(uuid, interval)
IS 'Authorizes stale-recipient recovery only for server-managed Plus-or-higher workspaces, then delegates to the private implementation.';
