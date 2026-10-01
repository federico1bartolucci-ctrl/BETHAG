-- Keep unit owner references consistent when a condominium member is deleted.
CREATE OR REPLACE FUNCTION public.clean_deleted_member_owner_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $
DECLARE
  v_workspace uuid;
BEGIN
  SELECT c.workspace_id INTO v_workspace
  FROM public.condominiums c
  WHERE c.id = OLD.condominium_id;

  IF v_workspace IS NULL THEN
    RETURN OLD;
  END IF;

  UPDATE public.condominium_units u
  SET data = jsonb_set(
    COALESCE(u.data,'{}'::jsonb),
    '{ownerMemberIds}',
    COALESCE((
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM jsonb_array_elements(COALESCE(u.data->'ownerMemberIds','[]'::jsonb)) WITH ORDINALITY AS e(elem,ord)
      WHERE elem #>> '{}' <> OLD.legacy_id::text
    ), '[]'::jsonb),
    true
  ),
  updated_at = now()
  WHERE u.workspace_id = v_workspace
    AND u.condominium_id = OLD.condominium_id
    AND jsonb_typeof(u.data->'ownerMemberIds')='array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(u.data->'ownerMemberIds','[]'::jsonb)) e(elem)
      WHERE elem #>> '{}' = OLD.legacy_id::text
    );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_deleted_member_owner_references ON public.condominium_members;
CREATE TRIGGER trg_clean_deleted_member_owner_references
AFTER DELETE ON public.condominium_members
FOR EACH ROW EXECUTE FUNCTION public.clean_deleted_member_owner_references();

REVOKE EXECUTE ON FUNCTION public.clean_deleted_member_owner_references() FROM public, anon, authenticated;
