-- Serialize legacy ownerMemberIds updates for concurrent member saves.
-- The existing client-side read/modify/write can lose one co-owner when two
-- authenticated sessions save different members of the same unit concurrently.
-- Keep this as a proposed forward migration until the frozen canonical
-- Production migration sequence is explicitly reconciled and approved.

CREATE OR REPLACE FUNCTION public.sync_condominium_member_owner_references(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_previous_unit_id uuid,
  p_next_unit_id uuid,
  p_member_legacy_id bigint,
  p_should_be_owner boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_unit record;
  v_unit_ids uuid[];
  v_expected_count integer := 0;
  v_processed_count integer := 0;
  v_owner_ids jsonb;
  v_next_owner_ids jsonb;
  v_existing_owner_ids jsonb;
  v_member_data jsonb;
  v_member_active boolean;
  v_current_marker jsonb;
  v_status text;
  v_share text;
  v_rows integer;
BEGIN
  IF p_workspace_id IS NULL
     OR p_condominium_id IS NULL
     OR p_member_legacy_id IS NULL
     OR p_should_be_owner IS NULL THEN
    RAISE EXCEPTION 'OWNER_SYNC_INVALID_ARGUMENTS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = p_condominium_id
      AND c.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'OWNER_SYNC_CONDOMINIUM_SCOPE_MISMATCH';
  END IF;

  SELECT coalesce(array_agg(affected.unit_id ORDER BY affected.unit_id), ARRAY[]::uuid[])
    INTO v_unit_ids
  FROM (
    SELECT DISTINCT requested.unit_id
    FROM unnest(ARRAY[p_previous_unit_id, p_next_unit_id]) AS requested(unit_id)
    WHERE requested.unit_id IS NOT NULL
  ) AS affected;

  v_expected_count := pg_catalog.cardinality(v_unit_ids);

  IF v_expected_count = 0 THEN
    IF p_should_be_owner THEN
      RAISE EXCEPTION 'OWNER_SYNC_TARGET_UNIT_REQUIRED';
    END IF;
    RETURN 0;
  END IF;

  IF p_should_be_owner THEN
    IF p_next_unit_id IS NULL THEN
      RAISE EXCEPTION 'OWNER_SYNC_TARGET_UNIT_REQUIRED';
    END IF;

    SELECT m.data, m.active
      INTO v_member_data, v_member_active
    FROM public.condominium_members m
    WHERE m.condominium_id = p_condominium_id
      AND m.unit_id = p_next_unit_id
      AND m.legacy_id = p_member_legacy_id
    FOR SHARE;

    IF NOT FOUND OR v_member_active IS NOT TRUE
       OR coalesce(v_member_data->>'role', '') <> 'Proprietario' THEN
      RAISE EXCEPTION 'OWNER_SYNC_MEMBER_NOT_CURRENT_OWNER';
    END IF;

    IF v_member_data->>'currentOwner' IS NOT NULL THEN
      v_current_marker := v_member_data->'currentOwner';
    ELSIF v_member_data->>'current_owner' IS NOT NULL THEN
      v_current_marker := v_member_data->'current_owner';
    ELSIF v_member_data->'data'->>'current_owner' IS NOT NULL THEN
      v_current_marker := v_member_data->'data'->'current_owner';
    ELSIF v_member_data->'data'->>'currentOwner' IS NOT NULL THEN
      v_current_marker := v_member_data->'data'->'currentOwner';
    ELSE
      v_current_marker := NULL;
    END IF;

    IF v_current_marker IS NOT NULL AND v_current_marker <> 'true'::jsonb THEN
      RAISE EXCEPTION 'OWNER_SYNC_MEMBER_NOT_CURRENT_OWNER';
    END IF;

    v_status := coalesce(
      v_member_data->>'positionStatus',
      v_member_data->>'position_status',
      v_member_data->'data'->>'position_status',
      ''
    );
    IF v_status IN ('In chiusura', 'Archiviato') THEN
      RAISE EXCEPTION 'OWNER_SYNC_MEMBER_NOT_CURRENT_OWNER';
    END IF;

    v_share := nullif(pg_catalog.btrim(coalesce(
      v_member_data->>'ownership_share',
      v_member_data->'data'->>'ownership_share',
      ''
    )), '');
    IF v_share IS NOT NULL
       AND v_share ~ '^[+-]?[0-9]+([.][0-9]+)?$'
       AND v_share::numeric <= 0 THEN
      RAISE EXCEPTION 'OWNER_SYNC_MEMBER_NOT_CURRENT_OWNER';
    END IF;
  END IF;

  -- Lock affected unit rows in a stable order. The JSONB merge below is
  -- computed only after each lock is acquired, so a waiter sees the previous
  -- transaction's committed owner list instead of overwriting it from a stale
  -- client snapshot.
  FOR v_unit IN
    SELECT u.id, u.data
    FROM public.condominium_units u
    WHERE u.workspace_id = p_workspace_id
      AND u.condominium_id = p_condominium_id
      AND u.id = ANY(v_unit_ids)
    ORDER BY u.id
    FOR UPDATE
  LOOP
    v_processed_count := v_processed_count + 1;

    SELECT coalesce(jsonb_agg(owner.elem ORDER BY owner.ordinality), '[]'::jsonb)
      INTO v_owner_ids
    FROM jsonb_array_elements(
      CASE
        WHEN pg_catalog.jsonb_typeof(coalesce(v_unit.data, '{}'::jsonb)->'ownerMemberIds') = 'array'
          THEN v_unit.data->'ownerMemberIds'
        ELSE '[]'::jsonb
      END
    ) WITH ORDINALITY AS owner(elem, ordinality)
    WHERE owner.elem #>> '{}' <> p_member_legacy_id::text;

    v_next_owner_ids := v_owner_ids;
    v_existing_owner_ids := CASE
      WHEN pg_catalog.jsonb_typeof(coalesce(v_unit.data, '{}'::jsonb)->'ownerMemberIds') = 'array'
        THEN v_unit.data->'ownerMemberIds'
      ELSE '[]'::jsonb
    END;

    IF v_unit.id = p_next_unit_id AND p_should_be_owner THEN
      v_next_owner_ids := v_next_owner_ids || pg_catalog.jsonb_build_array(p_member_legacy_id);
    END IF;

    IF v_next_owner_ids IS DISTINCT FROM v_existing_owner_ids THEN
      UPDATE public.condominium_units u
      SET data = pg_catalog.jsonb_set(
            coalesce(v_unit.data, '{}'::jsonb),
            '{ownerMemberIds}',
            v_next_owner_ids,
            true
          ),
          updated_at = pg_catalog.now()
      WHERE u.id = v_unit.id
        AND u.workspace_id = p_workspace_id
        AND u.condominium_id = p_condominium_id;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows <> 1 THEN
        RAISE EXCEPTION 'OWNER_SYNC_UNIT_UPDATE_NOT_CONFIRMED';
      END IF;
    END IF;
  END LOOP;

  IF v_processed_count <> v_expected_count THEN
    RAISE EXCEPTION 'OWNER_SYNC_UNIT_SCOPE_MISMATCH';
  END IF;

  RETURN v_processed_count;
END;
$function$;

COMMENT ON FUNCTION public.sync_condominium_member_owner_references(uuid, uuid, uuid, uuid, bigint, boolean) IS
  'Atomically merges one member legacy ID into the affected unit ownerMemberIds arrays under ordered row locks. Invoker security preserves the caller RLS policies.';

REVOKE ALL ON FUNCTION public.sync_condominium_member_owner_references(uuid, uuid, uuid, uuid, bigint, boolean)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.sync_condominium_member_owner_references(uuid, uuid, uuid, uuid, bigint, boolean)
  TO authenticated;
