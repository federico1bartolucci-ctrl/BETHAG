-- Reconcile Production to the reviewed QA security and condominium lifecycle behavior.
-- Forward-only: no historical migration or data is rewritten.
-- Private SECURITY DEFINER implementations independently enforce auth.uid() and
-- workspace/module authorization. Public entry points remain SECURITY INVOKER.

-- QA-only repair for the authenticated invoker wrappers and archive metadata.
-- The private routines retain SECURITY DEFINER and enforce auth.uid() plus
-- workspace-module authorization before mutating condominium state.
CREATE OR REPLACE FUNCTION private.archive_condominium(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_archived_at timestamptz;
  v_archived_by uuid;
  v_reason text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF NOT private.can_manage_workspace_module(p_workspace_id, 'condomini') THEN
    RAISE EXCEPTION 'Autorizzazione gestione condomini richiesta';
  END IF;

  UPDATE public.condominiums
  SET archived_at = COALESCE(archived_at, now()),
      archived_by = CASE WHEN archived_at IS NULL THEN auth.uid() ELSE archived_by END,
      archive_reason = CASE
        WHEN NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN archive_reason
        ELSE trim(p_reason)
      END,
      data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
        'archivedAt', COALESCE(archived_at, now()),
        'archivedBy', COALESCE(archived_by, auth.uid()),
        'archiveReason', CASE
          WHEN NULLIF(trim(COALESCE(p_reason, '')), '') IS NULL THEN archive_reason
          ELSE trim(p_reason)
        END
      ),
      updated_at = now()
  WHERE id = p_condominium_id
    AND workspace_id = p_workspace_id
  RETURNING archived_at, archived_by, archive_reason
  INTO v_archived_at, v_archived_by, v_reason;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Condominio non trovato';
  END IF;

  INSERT INTO public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  VALUES
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'archived',
      'Condominio archiviato',
      jsonb_build_object(
        'archived_at', v_archived_at,
        'archived_by', v_archived_by,
        'reason', v_reason
      )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION private.restore_condominium(
  p_workspace_id uuid,
  p_condominium_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF NOT private.can_manage_workspace_module(p_workspace_id, 'condomini') THEN
    RAISE EXCEPTION 'Autorizzazione gestione condomini richiesta';
  END IF;

  UPDATE public.condominiums
  SET archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      data = COALESCE(data, '{}'::jsonb) - 'archivedAt' - 'archivedBy' - 'archiveReason',
      updated_at = now()
  WHERE id = p_condominium_id
    AND workspace_id = p_workspace_id
    AND archived_at IS NOT NULL
  RETURNING name INTO v_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Condominio archiviato non trovato';
  END IF;

  INSERT INTO public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  VALUES
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'restored',
      'Condominio ripristinato dall''archivio',
      jsonb_build_object(
        'restored_by', auth.uid(),
        'restored_at', now(),
        'name', v_name
      )
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) TO authenticated;


CREATE OR REPLACE FUNCTION private.apply_incoming_transfer_member_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_members jsonb;
  v_record jsonb;
  v_missing_emails integer;
  v_distinct_emails integer;
BEGIN
  v_members := coalesce(NEW.data, '{}'::jsonb)->'incoming_members';
  IF pg_catalog.jsonb_typeof(v_members) IS DISTINCT FROM 'array' THEN
    RETURN NEW;
  END IF;

  IF pg_catalog.jsonb_array_length(v_members) > 1 THEN
    SELECT
      count(*) FILTER (
        WHERE nullif(pg_catalog.btrim(coalesce(value->>'email', '')), '') IS NULL
      ),
      count(DISTINCT pg_catalog.lower(pg_catalog.btrim(coalesce(value->>'email', ''))))
    INTO v_missing_emails, v_distinct_emails
    FROM pg_catalog.jsonb_array_elements(v_members) AS entries(value);

    IF v_missing_emails > 0 THEN
      RAISE EXCEPTION 'INCOMING_COOWNER_EMAIL_REQUIRED';
    END IF;
    IF v_distinct_emails <> pg_catalog.jsonb_array_length(v_members) THEN
      RAISE EXCEPTION 'INCOMING_COOWNER_EMAIL_DUPLICATE';
    END IF;
  END IF;

  SELECT value
  INTO v_record
  FROM pg_catalog.jsonb_array_elements(v_members) AS entries(value)
  WHERE pg_catalog.lower(pg_catalog.btrim(coalesce(value->>'name', ''))) =
        pg_catalog.lower(pg_catalog.btrim(coalesce(NEW.name, '')))
    AND pg_catalog.lower(pg_catalog.btrim(coalesce(value->>'email', ''))) =
        pg_catalog.lower(pg_catalog.btrim(coalesce(NEW.email, '')))
    AND nullif(pg_catalog.btrim(coalesce(value->>'ownership_share', '')), '')::numeric =
        nullif(pg_catalog.btrim(coalesce(NEW.data->>'ownership_share', '')), '')::numeric
  LIMIT 1;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'INCOMING_MEMBER_METADATA_NOT_MATCHED';
  END IF;

  NEW.data :=
    (coalesce(NEW.data, '{}'::jsonb) - 'incoming_members')
    || pg_catalog.jsonb_strip_nulls(
      pg_catalog.jsonb_build_object(
        'firstName', nullif(pg_catalog.btrim(v_record->>'firstName'), ''),
        'lastName', nullif(pg_catalog.btrim(v_record->>'lastName'), ''),
        'fiscalCode', nullif(pg_catalog.upper(pg_catalog.btrim(v_record->>'fiscalCode')), ''),
        'phone', nullif(pg_catalog.btrim(v_record->>'phone'), '')
      )
    );

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.apply_incoming_transfer_member_metadata()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_apply_incoming_transfer_member_metadata
  ON public.condominium_members;

CREATE TRIGGER trg_apply_incoming_transfer_member_metadata
BEFORE INSERT ON public.condominium_members
FOR EACH ROW
EXECUTE FUNCTION private.apply_incoming_transfer_member_metadata();


-- Narrow authenticated EXECUTE for the existing public SECURITY INVOKER RPC wrappers.
GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE EXECUTE ON FUNCTION private.admin_approve_portal_registration(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_approve_portal_registration(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.close_condominium_fiscal_year(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.close_condominium_fiscal_year(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.complete_portal_registration(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_portal_registration(text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.list_archived_condominiums(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.list_archived_condominiums(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.reverse_condominium_installment_payment(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reverse_condominium_installment_payment(uuid, uuid, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.verify_personal_security_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.verify_personal_security_code(text) TO authenticated;
-- The delete RPC is also used by the trusted backend service role.
GRANT EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) TO service_role;

-- Trigger functions do not need direct EXECUTE grants for trigger invocation.
-- Remove direct invocation rights while retaining the service_role ACL.
REVOKE EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() FROM PUBLIC, anon, authenticated;

-- This private staff helper is not a client RPC.
REVOKE EXECUTE ON FUNCTION private.is_workspace_staff(uuid) FROM authenticated;
