-- Align the transfer guard with the current condominiums schema.
-- The table uses archived_at (nullable timestamp), not an archived boolean.
DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  ) INTO v_definition;

  IF position('c.archived=true' in v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected archived predicate not found; migration aborted';
  END IF;

  v_definition := replace(v_definition, 'c.archived=true', 'c.archived_at is not null');
  EXECUTE v_definition;
END $$;
