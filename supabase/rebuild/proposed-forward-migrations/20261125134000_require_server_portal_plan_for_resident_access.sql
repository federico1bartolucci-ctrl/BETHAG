-- Server-authoritative Portal entitlement.
-- Active resident access and all Portal management paths require workspaces.plan = 'portal'.
-- Existing portal_access rows are retained; a downgrade makes them inaccessible without deleting data.

CREATE OR REPLACE FUNCTION private.workspace_has_portal_plan(target_workspace uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = target_workspace
      AND lower(trim(coalesce(w.plan, ''))) = 'portal'
  );
$function$;

REVOKE ALL ON FUNCTION private.workspace_has_portal_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_has_portal_plan(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION private.workspace_has_portal_plan(uuid)
IS 'Returns whether a workspace has the server-managed Portal plan; used by Portal RLS and registration guards.';

CREATE OR REPLACE FUNCTION private.can_access_resident_condominium_module(
  target_condominium uuid,
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
    FROM public.condominiums c
    JOIN public.portal_access pa
      ON pa.condominium_id = c.id
    JOIN public.condominium_members cm
      ON cm.condominium_id = pa.condominium_id
     AND cm.active = true
     AND (
       (pa.user_id IS NOT NULL AND cm.user_id = pa.user_id)
       OR lower(cm.email) = lower(pa.email)
     )
    WHERE c.id = target_condominium
      AND c.archived_at IS NULL
      AND private.workspace_has_portal_plan(c.workspace_id)
      AND pa.active = true
      AND pa.role IN ('resident', 'council')
      AND (
        pa.user_id = (SELECT auth.uid())
        OR lower(pa.email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
      )
      AND coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;

CREATE OR REPLACE FUNCTION private.upsert_portal_access_for_member(
  p_workspace_id uuid,
  p_member_id uuid,
  p_email text,
  p_permissions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_member public.condominium_members%rowtype;
  v_existing_id uuid;
  v_match_count integer;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_apartment text;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'PORTAL_EMAIL_REQUIRED';
  END IF;

  SELECT *
  INTO v_member
  FROM public.condominium_members
  WHERE id = p_member_id
    AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PORTAL_MEMBER_NOT_ACTIVE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = v_member.condominium_id
      AND c.workspace_id = p_workspace_id
      AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'PORTAL_CONDOMINIUM_WORKSPACE_MISMATCH';
  END IF;

  IF NOT private.workspace_has_portal_plan(p_workspace_id) THEN
    RAISE EXCEPTION 'PORTAL_PLAN_REQUIRED';
  END IF;

  SELECT count(*), (array_agg(pa.id))[1]
  INTO v_match_count, v_existing_id
  FROM public.portal_access pa
  WHERE pa.workspace_id = p_workspace_id
    AND (
      (v_member.legacy_id IS NOT NULL AND pa.legacy_id = v_member.legacy_id)
      OR (
        pa.condominium_id = v_member.condominium_id
        AND lower(pa.email) = v_email
      )
    );

  IF v_match_count > 1 THEN
    RAISE EXCEPTION 'PORTAL_ACCESS_CONFLICTING_DUPLICATE_ROWS';
  END IF;

  v_apartment := coalesce(v_member.data->>'apartment', '');

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.portal_access
    SET condominium_id = v_member.condominium_id,
        member_id = v_member.id,
        legacy_id = v_member.legacy_id,
        name = v_member.name,
        email = v_email,
        role = 'resident',
        apartment = v_apartment,
        permissions = coalesce(p_permissions, '[]'::jsonb),
        active = true,
        user_id = v_member.user_id,
        data = coalesce(v_member.data, '{}'::jsonb),
        updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.portal_access (
      workspace_id, condominium_id, member_id, legacy_id, name, email,
      role, apartment, permissions, active, user_id, data
    )
    VALUES (
      p_workspace_id, v_member.condominium_id, v_member.id, v_member.legacy_id,
      v_member.name, v_email, 'resident', v_apartment,
      coalesce(p_permissions, '[]'::jsonb), true, v_member.user_id,
      coalesce(v_member.data, '{}'::jsonb)
    );
  END IF;

  RETURN coalesce(v_existing_id, (
    SELECT pa.id
    FROM public.portal_access pa
    WHERE pa.workspace_id = p_workspace_id
      AND pa.condominium_id = v_member.condominium_id
      AND lower(pa.email) = v_email
    ORDER BY pa.updated_at DESC
    LIMIT 1
  ));
END;
$function$;

REVOKE ALL ON FUNCTION private.upsert_portal_access_for_member(uuid, uuid, text, jsonb)
FROM PUBLIC, anon, authenticated, service_role;

DROP POLICY IF EXISTS "authorized managers manage portal access" ON public.portal_access;
CREATE POLICY "authorized managers manage portal access"
ON public.portal_access
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  private.can_manage_workspace_module(workspace_id, 'portale')
  AND private.workspace_has_portal_plan(workspace_id)
)
WITH CHECK (
  private.can_manage_workspace_module(workspace_id, 'portale')
  AND private.workspace_has_portal_plan(workspace_id)
);

DROP POLICY IF EXISTS "residents read own portal access" ON public.portal_access;
CREATE POLICY "residents read own portal access"
ON public.portal_access
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = portal_access.condominium_id
      AND c.archived_at IS NULL
  )
  AND private.workspace_has_portal_plan(portal_access.workspace_id)
  AND (
    user_id = (SELECT auth.uid())
    OR (
      user_id IS NULL
      AND lower(email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
    )
  )
);

DROP POLICY IF EXISTS "managers read portal registration requests"
ON public.portal_registration_requests;
CREATE POLICY "managers read portal registration requests"
ON public.portal_registration_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (
    workspace_id IS NOT NULL
    AND private.can_manage_workspace_module(workspace_id, 'portale')
    AND private.workspace_has_portal_plan(workspace_id)
  )
  OR (
    workspace_id IS NULL
    AND condominium_name IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.condominiums c
      WHERE c.archived_at IS NULL
        AND lower(trim(c.name)) = lower(trim(portal_registration_requests.condominium_name))
        AND private.can_manage_workspace_module(c.workspace_id, 'portale')
        AND private.workspace_has_portal_plan(c.workspace_id)
    )
  )
);

DROP POLICY IF EXISTS "managers update portal registration requests"
ON public.portal_registration_requests;
CREATE POLICY "managers update portal registration requests"
ON public.portal_registration_requests
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND private.can_manage_workspace_module(workspace_id, 'portale')
  AND private.workspace_has_portal_plan(workspace_id)
)
WITH CHECK (
  workspace_id IS NOT NULL
  AND private.can_manage_workspace_module(workspace_id, 'portale')
  AND private.workspace_has_portal_plan(workspace_id)
);
