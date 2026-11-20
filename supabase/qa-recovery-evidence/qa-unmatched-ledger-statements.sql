-- QA LEDGER ENTRY 20261102041805 repair_authenticated_communication_rpc_private_execute
-- PostgreSQL md5=13c805e7976bb05fe96cf90e3b0eff2c; UTF-8 chars=1765
-- Original SQL statement. Evidence archive only; not a deployable migration.
CREATE OR REPLACE FUNCTION private.reset_stale_communication_recipients(
  p_communication_id uuid DEFAULT NULL::uuid,
  p_age interval DEFAULT '00:15:00'::interval
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_count integer;
  v_workspace uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF p_communication_id IS NULL THEN
    RAISE EXCEPTION 'ID comunicazione obbligatorio';
  END IF;

  SELECT c.workspace_id
    INTO v_workspace
  FROM public.communications c
  WHERE c.id = p_communication_id;

  IF v_workspace IS NULL THEN
    RAISE EXCEPTION 'Comunicazione non trovata';
  END IF;

  IF NOT private.can_manage_workspace_module(v_workspace, 'comunicazioni') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Comunicazioni richiesta';
  END IF;

  IF p_age IS NULL OR p_age < interval '5 minutes' THEN
    RAISE EXCEPTION 'Intervallo di recupero troppo breve';
  END IF;

  UPDATE public.communication_recipients
  SET status = 'pending',
      queued_at = NULL,
      error_message = NULL,
      updated_at = now()
  WHERE status = 'queued'
    AND queued_at IS NOT NULL
    AND queued_at < now() - p_age
    AND communication_id = p_communication_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('reset', v_count);
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.prepare_communication_recipients(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reset_stale_communication_recipients(uuid, interval) TO authenticated;

-- END QA LEDGER ENTRY 20261102041805

-- QA LEDGER ENTRY 20261102043152 repair_authenticated_condominium_delete_rpc_private_execute
-- PostgreSQL md5=3445174002fb32b3fd527234f2b5e383; UTF-8 chars=183
-- Original SQL statement. Evidence archive only; not a deployable migration.
REVOKE EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_condominium(uuid, bigint, text) TO authenticated;

-- END QA LEDGER ENTRY 20261102043152

-- QA LEDGER ENTRY 20261102043315 persist_condominium_archive_columns
-- PostgreSQL md5=b91071cee752a106596f7c9fcd9d1a72; UTF-8 chars=2101
-- Original SQL statement. Evidence archive only; not a deployable migration.
CREATE OR REPLACE FUNCTION private.save_condominium(
  p_workspace_id uuid,
  p_legacy_id bigint,
  p_name text,
  p_address text,
  p_city text,
  p_postal_code text,
  p_province text,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_id uuid;
  v_archived_at timestamptz;
  v_requested_archived_at timestamptz;
  v_archive_reason text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF NOT private.can_manage_workspace_module(p_workspace_id, 'condomini') THEN
    RAISE EXCEPTION 'Autorizzazione gestione condomini richiesta';
  END IF;

  v_requested_archived_at := NULLIF(p_data->>'archivedAt', '')::timestamptz;
  v_archive_reason := NULLIF(p_data->>'archiveReason', '');

  IF p_legacy_id IS NOT NULL THEN
    SELECT id, archived_at
      INTO v_id, v_archived_at
    FROM public.condominiums
    WHERE workspace_id = p_workspace_id
      AND legacy_id = p_legacy_id
    FOR UPDATE;

    IF v_id IS NOT NULL
       AND v_archived_at IS NOT NULL
       AND v_requested_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'Il condominio è archiviato: utilizzare prima il ripristino';
    END IF;
  END IF;

  INSERT INTO public.condominiums (
    workspace_id, legacy_id, name, address, city, postal_code, province,
    data, archived_at, archived_by, archive_reason
  )
  VALUES (
    p_workspace_id, p_legacy_id, p_name, p_address, p_city, p_postal_code,
    p_province, COALESCE(p_data, '{}'::jsonb),
    v_requested_archived_at,
    CASE WHEN v_requested_archived_at IS NOT NULL THEN auth.uid() ELSE NULL END,
    v_archive_reason
  )
  ON CONFLICT (workspace_id, legacy_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    province = EXCLUDED.province,
    data = EXCLUDED.data,
    archived_at = EXCLUDED.archived_at,
    archived_by = EXCLUDED.archived_by,
    archive_reason = EXCLUDED.archive_reason,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- END QA LEDGER ENTRY 20261102043315

-- QA LEDGER ENTRY 20261102044002 repair_condominium_archive_rpc_and_json
-- PostgreSQL md5=a2cb888c9c11b01010f5be5a6b8c9d69; UTF-8 chars=3435
-- Original SQL statement. Evidence archive only; not a deployable migration.
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
  WHERE id = p_condominium_id AND workspace_id = p_workspace_id
  RETURNING archived_at, archived_by, archive_reason INTO v_archived_at, v_archived_by, v_reason;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condominio non trovato'; END IF;
  INSERT INTO public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  VALUES (p_workspace_id, p_condominium_id, 'condominium', p_condominium_id,
    'archived', 'Condominio archiviato',
    jsonb_build_object('archived_at', v_archived_at, 'archived_by', v_archived_by, 'reason', v_reason));
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticazione richiesta'; END IF;
  IF NOT private.can_manage_workspace_module(p_workspace_id, 'condomini') THEN
    RAISE EXCEPTION 'Autorizzazione gestione condomini richiesta';
  END IF;
  UPDATE public.condominiums
  SET archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      data = COALESCE(data, '{}'::jsonb) - 'archivedAt' - 'archivedBy' - 'archiveReason',
      updated_at = now()
  WHERE id = p_condominium_id AND workspace_id = p_workspace_id AND archived_at IS NOT NULL
  RETURNING name INTO v_name;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condominio archiviato non trovato'; END IF;
  INSERT INTO public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  VALUES (p_workspace_id, p_condominium_id, 'condominium', p_condominium_id,
    'restored', 'Condominio ripristinato dall''archivio',
    jsonb_build_object('restored_by', auth.uid(), 'restored_at', now(), 'name', v_name));
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) TO authenticated;

-- END QA LEDGER ENTRY 20261102044002

-- QA LEDGER ENTRY 20261102044102 repair_authenticated_condominium_archive_rpc_private_execute
-- PostgreSQL md5=dc1d6e152db2bf98068eaaaed8a716a6; UTF-8 chars=583
-- Original SQL statement. Evidence archive only; not a deployable migration.
-- QA-only repair: public archive/restore wrappers are SECURITY INVOKER.
-- Their private SECURITY DEFINER implementations enforce auth.uid() and the
-- condomini module permission before changing archive metadata and audit rows.
REVOKE EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.archive_condominium(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.restore_condominium(uuid, uuid) TO authenticated;


-- END QA LEDGER ENTRY 20261102044102

-- QA LEDGER ENTRY 20261102044224 repair_authenticated_invoker_private_rpc_grants
-- PostgreSQL md5=112e4fb0c639c7c4fb5a6b466fc8f29b; UTF-8 chars=1766
-- Original SQL statement. Evidence archive only; not a deployable migration.
-- QA-only completion of authenticated invoker-to-private RPC grants.
-- Each implementation is SECURITY DEFINER and independently checks auth.uid()
-- plus its relevant workspace/module or registration preconditions.
REVOKE EXECUTE ON FUNCTION private.admin_approve_portal_registration(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.complete_portal_registration(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.list_archived_condominiums(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.reverse_condominium_installment_payment(uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.verify_personal_security_code(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.admin_approve_portal_registration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_first_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_portal_registration(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_archived_condominiums(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.reverse_condominium_installment_payment(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_personal_security_code(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.verify_personal_security_code(text) TO authenticated;

-- END QA LEDGER ENTRY 20261102044224

-- QA LEDGER ENTRY 20261102044603 revoke_public_execute_from_public_trigger_functions
-- PostgreSQL md5=ad6a921ecc9c9e1b2eb371fdc56d1049; UTF-8 chars=467
-- Original SQL statement. Evidence archive only; not a deployable migration.
-- QA-only least-privilege cleanup for trigger functions.
-- Trigger execution does not require callers to hold EXECUTE; only CREATE
-- TRIGGER does. Keep the owner/service_role grants while removing PUBLIC,
-- anon and authenticated direct invocation.
REVOKE EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() FROM PUBLIC, anon, authenticated;

-- END QA LEDGER ENTRY 20261102044603

-- QA LEDGER ENTRY 20261102050437 backfill_condominium_archive_metadata
-- PostgreSQL md5=fc023c7b6dacf094800dcb712c6137a1; UTF-8 chars=633
-- Original SQL statement. Evidence archive only; not a deployable migration.
-- Backfill legacy archive metadata written by the pre-RPC frontend.
-- Structured columns become the source of truth before JSON flags are ignored.
UPDATE public.condominiums
SET
  archived_at = COALESCE(archived_at, (data->>'archivedAt')::timestamptz),
  archived_by = COALESCE(
    archived_by,
    CASE
      WHEN data->>'archivedBy' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (data->>'archivedBy')::uuid
      ELSE NULL
    END
  ),
  archive_reason = COALESCE(archive_reason, NULLIF(data->>'archiveReason', ''))
WHERE
  archived_at IS NULL
  AND data->>'archivedAt' ~ '^\d{4}-\d{2}-\d{2}T';


-- END QA LEDGER ENTRY 20261102050437

-- QA LEDGER ENTRY 20261102050957 revoke_service_role_maintain_from_fund_availability_view
-- PostgreSQL md5=2000037273e0abfc6aacc0185ade7a0f; UTF-8 chars=80
-- Original SQL statement. Evidence archive only; not a deployable migration.
REVOKE MAINTAIN ON TABLE public.condominium_fund_availability FROM service_role;

-- END QA LEDGER ENTRY 20261102050957

-- QA LEDGER ENTRY 20261102054253 preserve_server_owned_condominium_archive_state
-- PostgreSQL md5=61363ad3c11f747d31e01f38fc80239b; UTF-8 chars=2278
-- Original SQL statement. Evidence archive only; not a deployable migration.
CREATE OR REPLACE FUNCTION private.save_condominium(
  p_workspace_id uuid,
  p_legacy_id bigint,
  p_name text,
  p_address text,
  p_city text,
  p_postal_code text,
  p_province text,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_id uuid;
  v_archived_at timestamptz;
  v_requested_archived_at timestamptz;
  v_archive_reason text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta';
  END IF;

  IF NOT private.can_manage_workspace_module(p_workspace_id, 'condomini') THEN
    RAISE EXCEPTION 'Autorizzazione gestione condomini richiesta';
  END IF;

  v_requested_archived_at := NULLIF(p_data->>'archivedAt', '')::timestamptz;
  v_archive_reason := NULLIF(p_data->>'archiveReason', '');

  IF p_legacy_id IS NOT NULL THEN
    SELECT id, archived_at
      INTO v_id, v_archived_at
    FROM public.condominiums
    WHERE workspace_id = p_workspace_id
      AND legacy_id = p_legacy_id
    FOR UPDATE;

    IF v_id IS NOT NULL
       AND v_archived_at IS NOT NULL
       AND v_requested_archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'Il condominio è archiviato: utilizzare prima il ripristino';
    END IF;
  END IF;

  INSERT INTO public.condominiums (
    workspace_id, legacy_id, name, address, city, postal_code, province,
    data, archived_at, archived_by, archive_reason
  )
  VALUES (
    p_workspace_id, p_legacy_id, p_name, p_address, p_city, p_postal_code,
    p_province, COALESCE(p_data, '{}'::jsonb),
    v_requested_archived_at,
    CASE WHEN v_requested_archived_at IS NOT NULL THEN auth.uid() ELSE NULL END,
    v_archive_reason
  )
  ON CONFLICT (workspace_id, legacy_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    province = EXCLUDED.province,
    data = EXCLUDED.data,
    -- Archive lifecycle is server-owned: ordinary state synchronization
    -- must not unarchive a record or erase its actor/reason metadata.
    archived_at = public.condominiums.archived_at,
    archived_by = public.condominiums.archived_by,
    archive_reason = public.condominiums.archive_reason,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- END QA LEDGER ENTRY 20261102054253

-- QA LEDGER ENTRY 20261102054409 add_workspace_member_profile_data
-- PostgreSQL md5=10621e7ff7e8e4c5e2d4a2cecf1d5040; UTF-8 chars=104
-- Original SQL statement. Evidence archive only; not a deployable migration.
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- END QA LEDGER ENTRY 20261102054409

-- QA LEDGER ENTRY 20261102100000 repair_authenticated_accounting_rpc_private_execute
-- PostgreSQL md5=130f653b12105bab6381bea10a717ff8; UTF-8 chars=1166
-- Original SQL statement. Evidence archive only; not a deployable migration.
-- Authenticated callers use the public invoker RPC wrappers from the browser.
-- The private SECURITY DEFINER implementations enforce workspace/module authorization
-- with auth.uid() and private.can_manage_workspace_module before any mutation.
-- Grant only the authenticated role; never grant PUBLIC.
GRANT EXECUTE ON FUNCTION private.close_condominium_fiscal_year(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) TO authenticated;


-- END QA LEDGER ENTRY 20261102100000

-- QA LEDGER ENTRY 20261102200820 restore_secure_communication_recipient_rpc_execute
-- PostgreSQL md5=dead4e27ddeb55a6b3781821e6cd63b2; UTF-8 chars=1746
-- Original SQL statement. Evidence archive only; not a deployable migration.
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

-- END QA LEDGER ENTRY 20261102200820

-- QA LEDGER ENTRY 20261103072843 qa_align_transfer_wrapper_empty_search_path
-- PostgreSQL md5=653419dddced397e8c5c24a5a70cb1f8; UTF-8 chars=83
-- Original SQL statement. Evidence archive only; not a deployable migration.
ALTER FUNCTION public.close_condominium_member_transfer(uuid) SET search_path = '';

-- END QA LEDGER ENTRY 20261103072843

-- QA LEDGER ENTRY 20261103193927 qa_store_incoming_coowner_profile_metadata
-- PostgreSQL md5=2a655ea00300cfeefe494b67961c4bc9; UTF-8 chars=2665
-- Original SQL statement. Evidence archive only; not a deployable migration.
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

-- END QA LEDGER ENTRY 20261103193927

-- QA LEDGER ENTRY 20261104122833 grant_service_role_private_resend_event_rpc
-- PostgreSQL md5=12d441902c439f1f7c49294d2f31f121; UTF-8 chars=298
-- Original SQL statement. Evidence archive only; not a deployable migration.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION private.apply_resend_communication_event(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;

-- END QA LEDGER ENTRY 20261104122833

-- QA LEDGER ENTRY 20261104125614 revoke_authenticated_execute_on_unused_private_workspace_staff
-- PostgreSQL md5=13e03ab576fb857d4b4d592e10acd224; UTF-8 chars=79
-- Original SQL statement. Evidence archive only; not a deployable migration.
REVOKE EXECUTE ON FUNCTION private.is_workspace_staff(uuid) FROM authenticated;

-- END QA LEDGER ENTRY 20261104125614
