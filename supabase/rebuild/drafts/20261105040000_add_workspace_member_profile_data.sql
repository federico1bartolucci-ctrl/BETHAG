-- Forward-only, additive Production parity repair for collaborator profile metadata.
-- Existing rows receive the empty JSON object; no existing columns or records are removed.
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $verify$
DECLARE v_type text; v_not_null boolean; v_default text;
BEGIN
  SELECT data_type, is_nullable='NO', column_default
    INTO v_type, v_not_null, v_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='workspace_members' AND column_name='data';

  IF v_type IS DISTINCT FROM 'jsonb' OR NOT COALESCE(v_not_null,false)
     OR v_default IS DISTINCT FROM '''{}''::jsonb' THEN
    RAISE EXCEPTION 'workspace_members.data postcondition failed: type %, not_null %, default %',v_type,v_not_null,v_default;
  END IF;
END;
$verify$;
