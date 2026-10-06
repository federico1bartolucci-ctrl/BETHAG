-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- private.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
CREATE OR REPLACE FUNCTION private.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_request public.portal_registration_requests%rowtype; v_member public.condominium_members%rowtype; v_workspace uuid;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
 select * into v_request from public.portal_registration_requests where id=p_request_id and status in ('pending','email_mismatch') for update;
 if not found then raise exception 'Richiesta non trovata o già gestita'; end if;
 if v_request.requested_user_id is null then raise exception 'La richiesta non è associata a un account autenticato'; end if;
 select * into v_member from public.condominium_members where id=p_member_id and active=true;
 if not found then raise exception 'Condòmino non trovato o non attivo'; end if;
 select c.workspace_id into v_workspace from public.condominiums c where c.id=v_member.condominium_id;
 if v_workspace is null or v_request.workspace_id is null or v_request.workspace_id<>v_workspace then raise exception 'Richiesta e condominio non appartengono allo stesso workspace'; end if;
 if exists(select 1 from public.condominiums c where c.id=v_member.condominium_id and c.archived_at is not null) then raise exception 'Il condominio è archiviato: approvazione portale non consentita'; end if;
 if not private.can_manage_workspace_module(v_workspace,'portale') then raise exception 'Autorizzazione gestione Portale richiesta'; end if;
 update public.condominium_members set user_id=v_request.requested_user_id,updated_at=now() where id=v_member.id;
 insert into public.portal_access(workspace_id,condominium_id,member_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data)
 values(v_workspace,v_member.condominium_id,v_member.id,v_member.legacy_id,v_member.name,lower(trim(v_request.email)),'resident',coalesce(v_member.data->>'apartment',''),'[]'::jsonb,true,v_request.requested_user_id,coalesce(v_member.data,'{}'::jsonb))
 on conflict do update set member_id=excluded.member_id,name=excluded.name,email=excluded.email,legacy_id=excluded.legacy_id,apartment=excluded.apartment,permissions=excluded.permissions,active=true,user_id=excluded.user_id,data=excluded.data,updated_at=now();
 insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id)
 values(v_workspace,v_request.requested_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id)
 on conflict(workspace_id,user_id) do update set active=true,role='resident',condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
 update public.profiles set full_name=v_member.name,email=lower(trim(v_request.email)),role='resident',active=true,updated_at=now() where id=v_request.requested_user_id;
 update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=v_request.id;
 return jsonb_build_object('status','approved','workspace_id',v_workspace,'member_id',v_member.id,'email_mismatch',lower(trim(v_request.email))<>lower(trim(coalesce(v_member.email,''))));
end;
$function$
;

-- private.apply_portal_member_permissions()
CREATE OR REPLACE FUNCTION private.apply_portal_member_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare member_role text;
begin
 select coalesce(cm.data->>'role',cm.role) into member_role
 from public.condominium_members cm
 where cm.id=new.member_id and cm.active=true;
 if member_role is null then
   select coalesce(cm.data->>'role',cm.role) into member_role
   from public.condominium_members cm
   where cm.condominium_id=new.condominium_id
     and ((new.user_id is not null and cm.user_id=new.user_id) or lower(trim(cm.email))=lower(trim(new.email)))
     and cm.active=true
   order by case when new.user_id is not null and cm.user_id=new.user_id then 0 else 1 end,cm.created_at
   limit 1;
 end if;
 if member_role='Inquilino' then
   new.permissions:='["pagamenti_ordinari","comunicazioni","regolamento"]'::jsonb;
 elsif member_role='Proprietario' then
   new.permissions:='["documenti","verbali","regolamento","pagamenti_ordinari","pagamenti_straordinari","assemblee","comunicazioni"]'::jsonb;
 end if;
 return new;
end;
$function$
;

-- private.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone)
CREATE OR REPLACE FUNCTION private.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.communication_recipients%rowtype;
  v_status text;
  v_comm uuid;
  v_counts jsonb;
begin
  if nullif(trim(p_provider_message_id),'') is null
     or nullif(trim(p_event_type),'') is null then
    raise exception 'Evento Resend incompleto';
  end if;

  select * into v_row
  from public.communication_recipients
  where provider_message_id=p_provider_message_id
    and (p_email is null or lower(trim(email))=lower(trim(p_email)))
  for update;

  if not found then
    return jsonb_build_object('status','ignored','reason','recipient_not_found');
  end if;

  v_status:=case p_event_type
    when 'email.delivered' then 'delivered'
    when 'email.bounced' then 'failed'
    when 'email.complained' then 'failed'
    when 'email.sent' then case when v_row.status='queued' then 'sent' else v_row.status end
    else v_row.status
  end;

  update public.communication_recipients
  set status=v_status,
      event_type=p_event_type,
      provider_event_id=coalesce(p_event_id,provider_event_id),
      delivered_at=case when p_event_type='email.delivered' then coalesce(p_event_at,now()) else delivered_at end,
      bounced_at=case when p_event_type='email.bounced' then coalesce(p_event_at,now()) else bounced_at end,
      complained_at=case when p_event_type='email.complained' then coalesce(p_event_at,now()) else complained_at end,
      error_message=case
        when p_event_type='email.bounced' then 'email.bounced'
        when p_event_type='email.complained' then 'email.complained'
        else error_message
      end,
      updated_at=now()
  where id=v_row.id
  returning communication_id into v_comm;

  select jsonb_build_object(
    'pending',count(*) filter(where status in ('pending','queued')),
    'sent',count(*) filter(where status='sent'),
    'delivered',count(*) filter(where status='delivered'),
    'failed',count(*) filter(where status='failed')
  ) into v_counts
  from public.communication_recipients
  where communication_id=v_comm;

  update public.communications
  set email_status=case
    when (v_counts->>'pending')::int>0 then 'In elaborazione'
    when (v_counts->>'failed')::int>0
      and ((v_counts->>'sent')::int+(v_counts->>'delivered')::int)>0 then 'Parzialmente inviata'
    when (v_counts->>'failed')::int>0 then 'Errore'
    when (v_counts->>'delivered')::int>0 and (v_counts->>'sent')::int=0 then 'Consegnata'
    when (v_counts->>'sent')::int>0 then 'Inviata'
    else email_status
  end,
  updated_at=now()
  where id=v_comm;

  return jsonb_build_object(
    'status','updated',
    'communication_id',v_comm,
    'counts',v_counts
  );
end;
$function$
;

-- private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text)
CREATE OR REPLACE FUNCTION private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_archived_at timestamptz;
  v_archived_by uuid;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = coalesce(archived_at, now()),
      archived_by = case when archived_at is null then auth.uid() else archived_by end,
      archive_reason = case
        when nullif(trim(coalesce(p_reason,'')),'') is null then archive_reason
        else trim(p_reason)
      end,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
  returning archived_at, archived_by, archive_reason
  into v_archived_at, v_archived_by, v_reason;

  if not found then
    raise exception 'Condominio non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'archived',
      'Condominio archiviato',
      jsonb_build_object(
        'archived_at', v_archived_at,
        'archived_by', v_archived_by,
        'reason', v_reason
      )
    );
end;
$function$
;

-- private.can_access_condominium(target_condominium uuid)
CREATE OR REPLACE FUNCTION private.can_access_condominium(target_condominium uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.condominiums c
    where c.id = target_condominium
      and c.archived_at is null
      and (
        private.is_workspace_admin(c.workspace_id)
        or private.can_access_workspace_module(c.workspace_id, 'condomini')
        or private.can_access_resident_condominium(c.id)
      )
  );
$function$
;

-- private.can_access_resident_condominium(target_condominium uuid)
CREATE OR REPLACE FUNCTION private.can_access_resident_condominium(target_condominium uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.condominiums c
    join public.portal_access pa
      on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  );
$function$
;

-- private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
CREATE OR REPLACE FUNCTION private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.condominiums c
    join public.portal_access pa on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$
;

-- private.can_access_workspace_module(target_workspace uuid, required_permission text)
CREATE OR REPLACE FUNCTION private.can_access_workspace_module(target_workspace uuid, required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$
;
