-- Keep unit owner references consistent when a condominium member is deleted.
CREATE OR REPLACE FUNCTION public.clean_deleted_member_owner_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.legacy_id IS NOT NULL THEN
    UPDATE public.condominium_units AS u
    SET data = pg_catalog.jsonb_set(
      COALESCE(u.data, '{}'::pg_catalog.jsonb),
      '{ownerMemberIds}',
      COALESCE((
        SELECT pg_catalog.jsonb_agg(e.elem ORDER BY e.ord)
        FROM pg_catalog.jsonb_array_elements(
          CASE
            WHEN pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
              THEN u.data->'ownerMemberIds'
            ELSE '[]'::pg_catalog.jsonb
          END
        ) WITH ORDINALITY AS e(elem, ord)
        WHERE e.elem #>> '{}' <> OLD.legacy_id::text
      ), '[]'::pg_catalog.jsonb),
      true
    ),
    updated_at = pg_catalog.now()
    FROM public.condominiums AS c
    WHERE c.id = u.condominium_id
      AND c.id = OLD.condominium_id
      AND u.workspace_id = c.workspace_id
      AND pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.jsonb_array_elements(u.data->'ownerMemberIds') AS e(elem)
        WHERE e.elem #>> '{}' = OLD.legacy_id::text
      );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_deleted_member_owner_references ON public.condominium_members;
CREATE TRIGGER trg_clean_deleted_member_owner_references
AFTER DELETE ON public.condominium_members
FOR EACH ROW EXECUTE FUNCTION public.clean_deleted_member_owner_references();

REVOKE EXECUTE ON FUNCTION public.clean_deleted_member_owner_references() FROM PUBLIC, anon, authenticated;
