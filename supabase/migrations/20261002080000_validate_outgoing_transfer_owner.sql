-- Require the outgoing member to be a current condominium owner, not merely
-- an active portal resident linked to the unit. This migration is compatible
-- with the earlier transfer RPC migration, which already includes this guard.
DO $migration$
DECLARE
  v_definition text;
  v_old text := 'AND m.unit_id=p_unit_id AND m.active';
  v_new text := 'AND m.unit_id=p_unit_id AND m.active
      AND trim(coalesce(m.data->>''role'',''''))=''Proprietario''
      AND coalesce(m.data->>''current_owner'',''true'')=''true''
      AND coalesce(m.data->>''position_status'',''Attivo'') <> ''In chiusura''';
BEGIN
  SELECT pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  ) INTO v_definition;
  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'Transfer function signature not found; migration aborted';
  END IF;

  -- The preceding migration may already have added these safeguards.
  IF position('Proprietario' in v_definition) > 0
     AND position('current_owner' in v_definition) > 0
     AND position('position_status' in v_definition) > 0 THEN
    RAISE NOTICE 'Outgoing owner guard already present; no change required';
    RETURN;
  END IF;

  IF length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) THEN
    RAISE EXCEPTION 'Expected one outgoing-member guard; migration aborted';
  END IF;
  v_definition := replace(v_definition,v_old,v_new);
  EXECUTE v_definition;
END
$migration$;
