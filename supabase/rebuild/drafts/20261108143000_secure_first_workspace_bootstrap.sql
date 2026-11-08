-- Draft only: secure self-service first-workspace bootstrap.
-- Not placed in supabase/migrations and not applied to QA or Production.
-- Existing workspaces remain unclaimed; this function never claims a legacy workspace.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_created_by_user_id
  ON public.workspaces(created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.create_first_workspace_for_authenticated_admin(p_workspace_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_name text := nullif(trim(p_workspace_name), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta' USING ERRCODE = '42501';
  END IF;
  IF v_name IS NULL OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Nome workspace non valido' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT w.id INTO v_workspace_id
  FROM public.workspaces AS w
  WHERE w.created_by_user_id = v_user_id
  FOR UPDATE;

  IF v_workspace_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_members AS wm
      WHERE wm.workspace_id = v_workspace_id
        AND wm.user_id = v_user_id
        AND wm.role = 'admin'
        AND wm.active = true
    ) THEN
      RAISE EXCEPTION 'Workspace già registrato ma membership amministrativa non valida'
        USING ERRCODE = '42501';
    END IF;
    RETURN v_workspace_id;
  END IF;

  INSERT INTO public.workspaces(name, plan, created_by_user_id)
  VALUES (v_name, 'free', v_user_id)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members(workspace_id, user_id, role, active, permissions)
  VALUES (v_workspace_id, v_user_id, 'admin', true, '{}'::jsonb);

  UPDATE public.profiles
  SET role = 'admin', active = true, updated_at = now()
  WHERE id = v_user_id;

  RETURN v_workspace_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_first_workspace_for_authenticated_admin(p_workspace_name text)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT private.create_first_workspace_for_authenticated_admin(p_workspace_name);
$function$;

REVOKE ALL ON FUNCTION private.create_first_workspace_for_authenticated_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_first_workspace_for_authenticated_admin(text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_first_workspace_for_authenticated_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_first_workspace_for_authenticated_admin(text) TO authenticated;

-- Disable the unsafe legacy claim endpoint. Existing workspaces are not claimable.
REVOKE ALL ON FUNCTION private.claim_first_workspace_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_first_workspace_admin(uuid) FROM PUBLIC, anon, authenticated;
