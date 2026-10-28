-- Respect the boolean value of collaborator module permissions.
-- Previously checking JSON key existence treated {"condomini": false} as allowed.
CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(
  target_workspace uuid,
  required_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace
      AND wm.user_id = (SELECT auth.uid())
      AND wm.active = true
      AND (
        wm.role = 'admin'
        OR (
          wm.role = 'collaborator'
          AND COALESCE((wm.permissions -> required_permission) = 'true'::jsonb, false)
        )
      )
  );
$function$;
