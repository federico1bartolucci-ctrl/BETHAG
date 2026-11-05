-- Forward-only Production reconciliation for portal registration upsert behavior.
-- Source: reviewed QA live payload 20261104235514, with explicit least-privilege helper ACL.
-- The existing authenticated caller grants are retained from the preceding security migration.
-- No existing portal_access rows are rewritten by this migration.

-- Repair portal registration upserts. PostgreSQL requires an explicit
-- conflict target for ON CONFLICT DO UPDATE; the old routines omitted it.
-- Centralize matching across the workspace legacy key and the case-insensitive
-- condominium/email key so registration and administrator approval behave alike.

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
  v_email text := lower(trim(coalesce(p_email,'')));
  v_apartment text;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'PORTAL_EMAIL_REQUIRED';
  END IF;

  SELECT * INTO v_member
  FROM public.condominium_members
  WHERE id = p_member_id AND active = true;

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

  v_apartment := coalesce(v_member.data->>'apartment','');

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.portal_access
    SET condominium_id = v_member.condominium_id,
        member_id = v_member.id,
        legacy_id = v_member.legacy_id,
        name = v_member.name,
        email = v_email,
        role = 'resident',
        apartment = v_apartment,
        permissions = coalesce(p_permissions,'[]'::jsonb),
        active = true,
        user_id = v_member.user_id,
        data = coalesce(v_member.data,'{}'::jsonb),
        updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.portal_access(
      workspace_id, condominium_id, member_id, legacy_id, name, email,
      role, apartment, permissions, active, user_id, data
    )
    VALUES(
      p_workspace_id, v_member.condominium_id, v_member.id, v_member.legacy_id,
      v_member.name, v_email, 'resident', v_apartment,
      coalesce(p_permissions,'[]'::jsonb), true, v_member.user_id,
      coalesce(v_member.data,'{}'::jsonb)
    );
  END IF;

  RETURN coalesce(v_existing_id, (
    SELECT pa.id FROM public.portal_access pa
    WHERE pa.workspace_id = p_workspace_id
      AND pa.condominium_id = v_member.condominium_id
      AND lower(pa.email) = v_email
    ORDER BY pa.updated_at DESC
    LIMIT 1
  ));
END;
$function$;

REVOKE ALL ON FUNCTION private.upsert_portal_access_for_member(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.complete_portal_registration(
  p_full_name text,
  p_fiscal_code text DEFAULT NULL,
  p_condominium_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_member public.condominium_members%rowtype;
  v_candidate_count integer := 0;
  v_workspace uuid;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Autenticazione richiesta'; END IF;

  SELECT lower(trim(u.email)) INTO v_email
  FROM auth.users u
  WHERE u.id = v_user_id AND u.email_confirmed_at IS NOT NULL;

  IF v_email IS NULL THEN RAISE EXCEPTION 'E-mail non ancora verificata'; END IF;

  SELECT count(*) INTO v_candidate_count
  FROM public.condominium_members cm
  WHERE cm.active = true
    AND (
      lower(trim(cm.name)) = lower(trim(p_full_name))
      OR (
        coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'') <> ''
        AND regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')
          = regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')
      )
    );

  IF v_candidate_count = 1 THEN
    SELECT cm.* INTO v_member
    FROM public.condominium_members cm
    WHERE cm.active = true
      AND (
        lower(trim(cm.name)) = lower(trim(p_full_name))
        OR (
          coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'') <> ''
          AND regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')
            = regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')
        )
      )
    LIMIT 1;

    SELECT c.workspace_id INTO v_workspace
    FROM public.condominiums c
    WHERE c.id = v_member.condominium_id;

    IF lower(trim(coalesce(v_member.email,''))) = v_email THEN
      UPDATE public.condominium_members
      SET user_id = v_user_id, updated_at = now()
      WHERE id = v_member.id
      RETURNING * INTO v_member;

      PERFORM private.upsert_portal_access_for_member(
        v_workspace,
        v_member.id,
        v_email,
        '["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb
      );

      INSERT INTO public.workspace_members(
        workspace_id,user_id,role,active,permissions,condominium_id,legacy_id
      )
      VALUES(
        v_workspace,v_user_id,'resident',true,'{}'::jsonb,
        v_member.condominium_id,v_member.legacy_id
      )
      ON CONFLICT(workspace_id,user_id)
      DO UPDATE SET active=true,role='resident',
        condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;

      UPDATE public.profiles
      SET full_name=v_member.name,email=v_email,role='resident',active=true,updated_at=now()
      WHERE id=v_user_id;

      UPDATE public.portal_registration_requests
      SET status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,
          requested_user_id=v_user_id,reviewed_at=coalesce(reviewed_at,now()),updated_at=now()
      WHERE lower(trim(email))=v_email AND status IN ('pending','email_mismatch');

      RETURN jsonb_build_object(
        'status','approved','workspace_id',v_workspace,
        'condominium_id',v_member.condominium_id,'member_id',v_member.id
      );
    END IF;

    INSERT INTO public.portal_registration_requests(
      workspace_id,requested_user_id,email,full_name,fiscal_code,
      condominium_name,status,matched_member_id,note
    )
    VALUES(
      v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),
      nullif(trim(p_condominium_name),''),'email_mismatch',v_member.id,
      'Incongruenza e-mail: e-mail dell''account diversa da quella presente nell''anagrafica del condòmino.'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_request_id;

    RETURN jsonb_build_object('status','email_mismatch','request_id',v_request_id);
  END IF;

  SELECT c.workspace_id INTO v_workspace
  FROM public.condominiums c
  WHERE p_condominium_name IS NOT NULL
    AND lower(trim(c.name))=lower(trim(p_condominium_name))
  GROUP BY c.workspace_id
  HAVING count(*)=1
  LIMIT 1;

  IF v_workspace IS NULL THEN
    SELECT min(w.id) INTO v_workspace
    FROM public.workspaces w
    HAVING count(*)=1;
  END IF;

  INSERT INTO public.portal_registration_requests(
    workspace_id,requested_user_id,email,full_name,fiscal_code,
    condominium_name,status,note
  )
  VALUES(
    v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),
    nullif(trim(p_condominium_name),''),'pending',
    'Profilo condòmino non individuato automaticamente.'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_request_id;

  UPDATE public.profiles
  SET full_name=trim(p_full_name),email=v_email,role='resident',active=true,updated_at=now()
  WHERE id=v_user_id;

  RETURN jsonb_build_object('status','pending','request_id',v_request_id);
END;
$function$;

CREATE OR REPLACE FUNCTION private.admin_approve_portal_registration(
  p_request_id uuid,
  p_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_request public.portal_registration_requests%rowtype;
  v_member public.condominium_members%rowtype;
  v_workspace uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticazione richiesta'; END IF;

  SELECT * INTO v_request
  FROM public.portal_registration_requests
  WHERE id=p_request_id AND status IN ('pending','email_mismatch')
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Richiesta non trovata o già gestita'; END IF;
  IF v_request.requested_user_id IS NULL THEN
    RAISE EXCEPTION 'La richiesta non è associata ad un account autenticato';
  END IF;

  SELECT * INTO v_member
  FROM public.condominium_members
  WHERE id=p_member_id AND active=true;

  IF NOT FOUND THEN RAISE EXCEPTION 'Condòmino non trovato o non attivo'; END IF;

  SELECT c.workspace_id INTO v_workspace
  FROM public.condominiums c
  WHERE c.id=v_member.condominium_id;

  IF v_workspace IS NULL OR v_request.workspace_id IS NULL OR v_request.workspace_id<>v_workspace THEN
    RAISE EXCEPTION 'Richiesta e condominio non appartengono allo stesso workspace';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.condominiums c
    WHERE c.id=v_member.condominium_id AND c.archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Il condominio è archiviato: approvazione portale non consentita';
  END IF;

  IF NOT private.can_manage_workspace_module(v_workspace,'portale') THEN
    RAISE EXCEPTION 'Autorizzazione gestione Portale richiesta';
  END IF;

  UPDATE public.condominium_members
  SET user_id=v_request.requested_user_id,updated_at=now()
  WHERE id=v_member.id
  RETURNING * INTO v_member;

  PERFORM private.upsert_portal_access_for_member(
    v_workspace,
    v_member.id,
    lower(trim(v_request.email)),
    '[]'::jsonb
  );

  INSERT INTO public.workspace_members(
    workspace_id,user_id,role,active,permissions,condominium_id,legacy_id
  )
  VALUES(
    v_workspace,v_request.requested_user_id,'resident',true,'{}'::jsonb,
    v_member.condominium_id,v_member.legacy_id
  )
  ON CONFLICT(workspace_id,user_id)
  DO UPDATE SET active=true,role='resident',
    condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;

  UPDATE public.profiles
  SET full_name=v_member.name,email=lower(trim(v_request.email)),
      role='resident',active=true,updated_at=now()
  WHERE id=v_request.requested_user_id;

  UPDATE public.portal_registration_requests
  SET status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,
      reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  WHERE id=v_request.id;

  RETURN jsonb_build_object(
    'status','approved','workspace_id',v_workspace,
    'member_id',v_member.id,
    'email_mismatch',lower(trim(v_request.email))<>lower(trim(coalesce(v_member.email,'')))
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.complete_portal_registration(text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.admin_approve_portal_registration(uuid,uuid) FROM PUBLIC, anon;


-- The helper is only an implementation detail of the two SECURITY DEFINER callers.
-- It must not be directly callable by application roles or service_role.
REVOKE EXECUTE ON FUNCTION private.upsert_portal_access_for_member(uuid, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

DO $verify$
DECLARE
  v_helper oid := 'private.upsert_portal_access_for_member(uuid,uuid,text,jsonb)'::regprocedure;
  v_admin oid := 'private.admin_approve_portal_registration(uuid,uuid)'::regprocedure;
  v_complete oid := 'private.complete_portal_registration(text,text,text)'::regprocedure;
  v_admin_def text;
  v_complete_def text;
BEGIN
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_helper)
     OR NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_admin)
     OR NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_complete) THEN
    RAISE EXCEPTION 'Portal registration implementation must remain SECURITY DEFINER';
  END IF;

  IF has_function_privilege('anon', v_helper, 'EXECUTE')
     OR has_function_privilege('authenticated', v_helper, 'EXECUTE')
     OR has_function_privilege('service_role', v_helper, 'EXECUTE') THEN
    RAISE EXCEPTION 'Internal portal upsert helper is directly executable by an application role';
  END IF;

  IF NOT has_function_privilege('authenticated', v_admin, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_complete, 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated portal registration entry points lost their intended EXECUTE grant';
  END IF;

  SELECT pg_get_functiondef(v_admin) INTO v_admin_def;
  SELECT pg_get_functiondef(v_complete) INTO v_complete_def;
  IF position('private.upsert_portal_access_for_member' IN v_admin_def) = 0
     OR position('private.upsert_portal_access_for_member' IN v_complete_def) = 0 THEN
    RAISE EXCEPTION 'Portal registration callers are not wired to the centralized upsert helper';
  END IF;
END;
$verify$;
