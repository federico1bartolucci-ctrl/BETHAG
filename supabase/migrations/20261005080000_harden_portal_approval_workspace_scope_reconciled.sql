-- Scope portal approval to the request workspace and matched condominium workspace.
create or replace function public.admin_approve_portal_registration(
  p_request_id uuid, p_member_id uuid
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare
  v_request public.portal_registration_requests%rowtype;
  v_member public.condominium_members%rowtype;
  v_workspace uuid;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  select * into v_request from public.portal_registration_requests
  where id=p_request_id and status in ('pending','email_mismatch') for update;
  if not found then raise exception 'Richiesta non trovata o già gestita'; end if;
  select * into v_member from public.condominium_members
  where id=p_member_id and active=true;
  if not found then raise exception 'Condòmino non trovato o non attivo'; end if;
  select c.workspace_id into v_workspace from public.condominiums c
  where c.id=v_member.condominium_id;
  if v_workspace is null or v_request.workspace_id is null or v_request.workspace_id<>v_workspace
    then raise exception 'Richiesta e condominio non appartengono allo stesso workspace'; end if;
  if not private.can_manage_workspace_module(v_workspace,'portale')
    then raise exception 'Autorizzazione gestione Portale richiesta'; end if;
  if lower(trim(v_request.email))<>lower(trim(coalesce(v_member.email,'')))
    then raise exception 'L''e-mail della richiesta non coincide con quella del condòmino selezionato'; end if;
  update public.condominium_members set user_id=v_request.requested_user_id,updated_at=now()
  where id=v_member.id;
  insert into public.portal_access(
    workspace_id,condominium_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data,member_id
  ) values(
    v_workspace,v_member.condominium_id,v_member.legacy_id,v_member.name,lower(trim(v_member.email)),
    'resident',coalesce(v_member.data->>'apartment',''),
    '["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb,true,
    v_request.requested_user_id,coalesce(v_member.data,'{}'::jsonb),v_member.id
  )
  on conflict (workspace_id,condominium_id,email) do update set
    name=excluded.name,legacy_id=excluded.legacy_id,apartment=excluded.apartment,
    permissions=excluded.permissions,active=true,user_id=excluded.user_id,data=excluded.data,
    member_id=excluded.member_id,updated_at=now();
  insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id)
  values(v_workspace,v_request.requested_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id)
  on conflict(workspace_id,user_id) do update set active=true,role='resident',
    condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
  update public.profiles set full_name=v_member.name,email=lower(trim(v_member.email)),
    role='resident',active=true,updated_at=now() where id=v_request.requested_user_id;
  update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,
    workspace_id=v_workspace,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=v_request.id;
  return jsonb_build_object('status','approved','workspace_id',v_workspace,'member_id',v_member.id);
end;
$function$;