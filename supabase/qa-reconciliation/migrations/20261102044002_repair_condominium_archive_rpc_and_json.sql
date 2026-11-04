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
