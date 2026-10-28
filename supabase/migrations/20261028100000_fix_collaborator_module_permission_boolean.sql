-- Respect the boolean value of collaborator module permissions.
-- A JSON object key set to false must not grant access just because the key exists.
-- Legacy array-shaped permission lists remain supported.
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
          AND CASE jsonb_typeof(wm.permissions)
            WHEN 'array' THEN COALESCE(wm.permissions ? required_permission, false)
            WHEN 'object' THEN COALESCE((wm.permissions -> required_permission) = 'true'::jsonb, false)
            ELSE false
          END
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_access_workspace_module(
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
          AND CASE jsonb_typeof(wm.permissions)
            WHEN 'array' THEN COALESCE(wm.permissions ? required_permission, false)
            WHEN 'object' THEN COALESCE((wm.permissions -> required_permission) = 'true'::jsonb, false)
            ELSE false
          END
        )
      )
  );
$function$;
