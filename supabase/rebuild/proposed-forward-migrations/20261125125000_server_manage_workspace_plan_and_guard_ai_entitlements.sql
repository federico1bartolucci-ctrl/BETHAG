-- Workspace subscription plan is server-managed. Authenticated workspace admins
-- may manage workspace metadata, but cannot self-upgrade the plan through PostgREST.
CREATE OR REPLACE FUNCTION private.guard_workspace_plan_server_managed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.plan IS DISTINCT FROM 'free' THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'WORKSPACE_PLAN_SERVER_MANAGED';
    END IF;
  ELSIF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'WORKSPACE_PLAN_SERVER_MANAGED';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_workspace_plan_server_managed ON public.workspaces;
CREATE TRIGGER trg_workspace_plan_server_managed
BEFORE INSERT OR UPDATE OF plan ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION private.guard_workspace_plan_server_managed();

REVOKE ALL ON FUNCTION private.guard_workspace_plan_server_managed()
FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.guard_workspace_plan_server_managed()
IS 'Prevents client roles from changing workspace.plan; only postgres and service_role may change server-owned entitlements.';
