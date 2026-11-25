-- A Plus entitlement allows administrators to create and email communications.
-- Publishing those communications to the resident Portal is a distinct Portal-plan
-- capability and must be enforced by PostgreSQL, not only by the frontend.
--
-- Requires 20261125134000_require_server_portal_plan_for_resident_access.sql,
-- which defines private.workspace_has_portal_plan(uuid).

CREATE OR REPLACE FUNCTION private.guard_communications_plan_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_content_changed boolean := false;
  v_business_data_changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT private.workspace_has_plus_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'COMMUNICATIONS_PLAN_REQUIRED';
    END IF;

    IF NEW.published IS TRUE
       AND NOT private.workspace_has_portal_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'PORTAL_PLAN_REQUIRED';
    END IF;

    RETURN NEW;
  END IF;

  -- The JSON data column mirrors relational fields and UI-only delivery metadata.
  -- Ignore those mirrors when detecting business-content changes so an in-flight
  -- email status update or an unpublish action remains possible after downgrade.
  v_business_data_changed :=
    (coalesce(NEW.data, '{}'::jsonb) - ARRAY[
      'id', 'title', 'body', 'condominiumId', 'status',
      'publishedToPortal', 'emailStatus', 'emailPreparedAt'
    ]::text[])
    IS DISTINCT FROM
    (coalesce(OLD.data, '{}'::jsonb) - ARRAY[
      'id', 'title', 'body', 'condominiumId', 'status',
      'publishedToPortal', 'emailStatus', 'emailPreparedAt'
    ]::text[]);

  v_content_changed :=
       NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.condominium_id IS DISTINCT FROM OLD.condominium_id
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.body IS DISTINCT FROM OLD.body
    OR v_business_data_changed
    OR NEW.legacy_id IS DISTINCT FROM OLD.legacy_id
    OR (NEW.published IS DISTINCT FROM OLD.published AND NEW.published IS TRUE);

  IF v_content_changed THEN
    IF NOT private.workspace_has_plus_plan(OLD.workspace_id)
       OR NOT private.workspace_has_plus_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'COMMUNICATIONS_PLAN_REQUIRED';
    END IF;

    -- Any content edit to a currently published Portal communication remains a
    -- Portal capability. Setting published=true also enters this branch.
    IF NEW.published IS TRUE
       AND NOT private.workspace_has_portal_plan(NEW.workspace_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'PORTAL_PLAN_REQUIRED';
    END IF;
  END IF;

  -- Unpublishing and delivery-status/provider-field finalization remain possible
  -- after downgrade. The app's JSON mirror fields are excluded above.
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION private.guard_communications_plan_entitlement()
IS 'Requires Plus-or-higher for communication content and recipient workflows; requires Portal for publishing communication content to residents. Allows unpublishing and delivery-status finalization after downgrade.';
