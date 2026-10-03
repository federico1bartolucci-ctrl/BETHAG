-- Keep unit owner references consistent when a condominium member is deleted.
-- ownerMemberIds stores condominium_members.legacy_id values; the condominium
-- identifier is sufficient to scope the update because unit/member IDs are
-- globally unique UUIDs and legacy IDs are scoped by condominium.
CREATE OR REPLACE FUNCTION public.clean_deleted_member_owner_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF OLD.legacy_id IS NOT NULL THEN
    UPDATE public.condominium_units AS u
    SET data = jsonb_set(
      COALESCE(u.data, '{}'::jsonb),
      '{ownerMemberIds}',
      COALESCE((
        SELECT jsonb_agg(e.elem ORDER BY e.ord)
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(u.data->'ownerMemberIds') = 'array'
              THEN u.data->'ownerMemberIds'
            ELSE '[]'::jsonb
          END
        ) WITH ORDINALITY AS e(elem, ord)
        WHERE e.elem #>> '{}' <> OLD.legacy_id::text
      ), '[]'::jsonb),
      true
    ),
    updated_at = now()
    WHERE u.condominium_id = OLD.condominium_id
      AND EXISTS (
        SELECT 1
        FROM public.condominiums AS c
        WHERE c.id = OLD.condominium_id
          AND c.workspace_id = u.workspace_id
      )
      AND jsonb_typeof(u.data->'ownerMemberIds') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(u.data->'ownerMemberIds') = 'array'
              THEN u.data->'ownerMemberIds'
            ELSE '[]'::jsonb
          END
        ) AS e(elem)
        WHERE e.elem #>> '{}' = OLD.legacy_id::text
      );
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_clean_deleted_member_owner_references
  ON public.condominium_members;
CREATE TRIGGER trg_clean_deleted_member_owner_references
AFTER DELETE ON public.condominium_members
FOR EACH ROW
EXECUTE FUNCTION public.clean_deleted_member_owner_references();

REVOKE EXECUTE ON FUNCTION public.clean_deleted_member_owner_references()
  FROM PUBLIC, anon, authenticated;
