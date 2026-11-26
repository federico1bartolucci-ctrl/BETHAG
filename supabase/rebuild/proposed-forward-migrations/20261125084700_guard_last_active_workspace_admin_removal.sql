-- Preserve at least one active administrator in every workspace.
-- The Edge Function's count-then-delete check is not atomic: two admins can
-- both observe a count of two and concurrently delete themselves. This trigger
-- serializes removals on the parent workspace row and rechecks after the lock.

CREATE OR REPLACE FUNCTION private.prevent_last_active_workspace_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_workspace_id uuid;
  v_locked_workspace_id uuid;
  v_other_active_admins integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'admin' OR OLD.active IS NOT TRUE THEN
      RETURN OLD;
    END IF;
    v_workspace_id := OLD.workspace_id;
  ELSE
    IF OLD.role <> 'admin' OR OLD.active IS NOT TRUE THEN
      RETURN NEW;
    END IF;

    -- Changes unrelated to the active-admin invariant do not need the lock.
    IF NEW.workspace_id IS NOT DISTINCT FROM OLD.workspace_id
       AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND NEW.role = 'admin'
       AND NEW.active IS TRUE THEN
      RETURN NEW;
    END IF;
    v_workspace_id := OLD.workspace_id;
  END IF;

  -- Serialize all removals/demotions for this workspace. If the workspace
  -- itself is being deleted, its cascading membership deletes are allowed.
  SELECT w.id
    INTO v_locked_workspace_id
  FROM public.workspaces w
  WHERE w.id = v_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
    INTO v_other_active_admins
  FROM public.workspace_members wm
  WHERE wm.workspace_id = v_workspace_id
    AND wm.role = 'admin'
    AND wm.active IS TRUE
    AND wm.user_id IS DISTINCT FROM OLD.user_id;

  IF v_other_active_admins = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'LAST_ACTIVE_WORKSPACE_ADMIN: cannot remove or deactivate the last active workspace administrator';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.prevent_last_active_workspace_admin_removal() FROM PUBLIC;

DO $revoke$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION private.prevent_last_active_workspace_admin_removal() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION private.prevent_last_active_workspace_admin_removal() FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION private.prevent_last_active_workspace_admin_removal() FROM service_role';
  END IF;
END;
$revoke$;

DROP TRIGGER IF EXISTS trg_guard_last_active_workspace_admin_delete
  ON public.workspace_members;
CREATE TRIGGER trg_guard_last_active_workspace_admin_delete
BEFORE DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION private.prevent_last_active_workspace_admin_removal();

DROP TRIGGER IF EXISTS trg_guard_last_active_workspace_admin_update
  ON public.workspace_members;
CREATE TRIGGER trg_guard_last_active_workspace_admin_update
BEFORE UPDATE OF workspace_id, user_id, role, active ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION private.prevent_last_active_workspace_admin_removal();
