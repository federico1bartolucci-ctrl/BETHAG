-- Evaluate the last-active-admin deletion precheck in one PostgreSQL statement snapshot.
-- PostgREST offset pagination can return a mixed set when a membership is
-- replaced between pages while the exact row count remains unchanged.
-- The workspace_members trigger remains the authoritative concurrent guard.

CREATE OR REPLACE FUNCTION public.has_last_active_workspace_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS target
    WHERE target.user_id = p_user_id
      AND target.role = 'admin'
      AND target.active IS TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM public.workspace_members AS other
        WHERE other.workspace_id = target.workspace_id
          AND other.role = 'admin'
          AND other.active IS TRUE
          AND other.user_id <> p_user_id
      )
  );
$function$;

COMMENT ON FUNCTION public.has_last_active_workspace_admin(uuid) IS
  'Service-role-only, single-statement snapshot check used by delete-account. The workspace_members trigger remains the authoritative concurrent invariant.';

REVOKE ALL ON FUNCTION public.has_last_active_workspace_admin(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_last_active_workspace_admin(uuid)
  TO service_role;
