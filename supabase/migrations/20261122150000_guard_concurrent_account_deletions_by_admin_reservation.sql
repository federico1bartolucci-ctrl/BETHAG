-- Prevent concurrent account deletions from removing every active workspace admin.
-- Reservations persist across the external Auth Admin API call and expire after one hour.
CREATE TABLE IF NOT EXISTS public.account_deletion_admin_reservations (
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE public.account_deletion_admin_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_deletion_admin_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.account_deletion_admin_reservations TO service_role;

CREATE OR REPLACE FUNCTION private.reserve_account_deletion_admins(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_workspace_id uuid;
  v_admin_count integer;
  v_other_reservations integer;
  v_reserved integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_USER_REQUIRED';
  END IF;
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_SERVICE_ROLE_REQUIRED';
  END IF;

  DELETE FROM public.account_deletion_admin_reservations
  WHERE created_at < now() - interval '1 hour';

  -- Acquire all workspace locks in a deterministic order to avoid deadlocks.
  FOR v_workspace_id IN
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = p_user_id
      AND wm.role = 'admin'
      AND wm.active = true
    ORDER BY wm.workspace_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_workspace_id::text, 0)
    );

    SELECT count(*)::integer INTO v_admin_count
    FROM public.workspace_members wm
    WHERE wm.workspace_id = v_workspace_id
      AND wm.role = 'admin'
      AND wm.active = true;

    SELECT count(DISTINCT r.user_id)::integer INTO v_other_reservations
    FROM public.account_deletion_admin_reservations r
    WHERE r.workspace_id = v_workspace_id
      AND r.user_id <> p_user_id
      AND r.created_at >= now() - interval '1 hour';

    IF v_admin_count - v_other_reservations <= 1 THEN
      RAISE EXCEPTION 'ACCOUNT_DELETION_LAST_ADMIN';
    END IF;
  END LOOP;

  INSERT INTO public.account_deletion_admin_reservations(workspace_id, user_id)
  SELECT wm.workspace_id, p_user_id
  FROM public.workspace_members wm
  WHERE wm.user_id = p_user_id
    AND wm.role = 'admin'
    AND wm.active = true
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET created_at = excluded.created_at;

  GET DIAGNOSTICS v_reserved = ROW_COUNT;
  RETURN v_reserved;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_account_deletion_admins(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.reserve_account_deletion_admins(p_user_id);
$function$;

CREATE OR REPLACE FUNCTION private.release_account_deletion_admin_reservations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  IF p_user_id IS NULL OR coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_SERVICE_ROLE_REQUIRED';
  END IF;

  DELETE FROM public.account_deletion_admin_reservations
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_account_deletion_admin_reservations(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT private.release_account_deletion_admin_reservations(p_user_id);
$function$;

REVOKE ALL ON FUNCTION private.reserve_account_deletion_admins(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.release_account_deletion_admin_reservations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_account_deletion_admins(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_account_deletion_admin_reservations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_account_deletion_admins(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_account_deletion_admin_reservations(uuid) TO service_role;
