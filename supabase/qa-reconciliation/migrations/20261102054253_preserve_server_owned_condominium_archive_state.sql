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
