create or replace function public.complete_portal_registration(p_full_name text,p_fiscal_code text default null,p_condominium_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_email text; v_member public.condominium_members%rowtype; v_candidate_count integer:=0; v_workspace uuid; v_request_id uuid;
begin
if v_user_id is null then raise exception 'Autenticazione richiesta'; end if;
select lower(trim(u.email)) into v_email from auth.users u where u.id=v_user_id and u.email_confirmed_at is not null;
if v_email is null then raise exception 'E-mail non ancora verificata'; end if;
select count(*) into v_candidate_count from public.condominium_members cm where cm.active=true and lower(trim(cm.email))=v_email and (lower(trim(cm.name))=lower(trim(p_full_name)) or (coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>'' and regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')=regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')));
if v_candidate_count=1 then
select cm.* into v_member from public.condominium_members cm where cm.active=true and lower(trim(cm.email))=v_email and (lower(trim(cm.name))=lower(trim(p_full_name)) or (coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>'' and regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')=regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'))) limit 1;
select c.workspace_id into v_workspace from public.condominiums c where c.id=v_member.condominium_id;
update public.condominium_members set user_id=v_user_id,updated_at=now() where id=v_member.id;
insert into public.portal_access(workspace_id,condominium_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data) values(v_workspace,v_member.condominium_id,v_member.legacy_id,v_member.name,v_email,'resident',coalesce(v_member.data->>'apartment',''),'["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb,true,v_user_id,coalesce(v_member.data,'{}'::jsonb)) on conflict (id) do update set user_id=excluded.user_id,active=true,updated_at=now();
insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id) values(v_workspace,v_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id) on conflict(workspace_id,user_id) do update set active=true,role='resident',condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
update public.profiles set full_name=v_member.name,email=v_email,role='resident',active=true,updated_at=now() where id=v_user_id;
update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,requested_user_id=v_user_id,reviewed_at=coalesce(reviewed_at,now()),updated_at=now() where lower(trim(email))=v_email and status='pending';
return jsonb_build_object('status','approved','workspace_id',v_workspace,'condominium_id',v_member.condominium_id,'member_id',v_member.id);
end if;
select c.workspace_id into v_workspace from public.condominiums c where p_condominium_name is not null and lower(trim(c.name))=lower(trim(p_condominium_name)) group by c.workspace_id having count(*)=1 limit 1;
insert into public.portal_registration_requests(workspace_id,requested_user_id,email,full_name,fiscal_code,condominium_name,status) values(v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),nullif(trim(p_condominium_name),''),'pending') on conflict do nothing returning id into v_request_id;
update public.profiles set full_name=trim(p_full_name),email=v_email,role='resident',active=true,updated_at=now() where id=v_user_id;
return jsonb_build_object('status','pending','request_id',v_request_id,'workspace_id',v_workspace);
end; $$;
create or replace function public.admin_approve_portal_registration(p_request_id uuid,p_member_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.portal_registration_requests%rowtype; v_member public.condominium_members%rowtype; v_workspace uuid;
begin
if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
select * into v_request from public.portal_registration_requests where id=p_request_id and status='pending' for update;
if not found then raise exception 'Richiesta non trovata o già gestita'; end if;
select cm.* into v_member from public.condominium_members cm where cm.id=p_member_id and cm.active=true;
if not found then raise exception 'Condòmino non trovato o non attivo'; end if;
select c.workspace_id into v_workspace from public.condominiums c where c.id=v_member.condominium_id;
if v_workspace is null or not private.is_workspace_manager(v_workspace) then raise exception 'Autorizzazione amministrativa richiesta'; end if;
if lower(trim(v_request.email))<>lower(trim(v_member.email)) then raise exception 'L''e-mail della richiesta non coincide con quella del condòmino selezionato'; end if;
update public.condominium_members set user_id=v_request.requested_user_id,updated_at=now() where id=v_member.id;
insert into public.portal_access(workspace_id,condominium_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data) values(v_workspace,v_member.condominium_id,v_member.legacy_id,v_member.name,lower(trim(v_member.email)),'resident',coalesce(v_member.data->>'apartment',''),'["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb,true,v_request.requested_user_id,coalesce(v_member.data,'{}'::jsonb)) on conflict (id) do update set user_id=excluded.user_id,active=true,updated_at=now();
insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id) values(v_workspace,v_request.requested_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id) on conflict(workspace_id,user_id) do update set active=true,role='resident',condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
update public.profiles set full_name=v_member.name,email=lower(trim(v_member.email)),role='resident',active=true,updated_at=now() where id=v_request.requested_user_id;
update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=v_request.id;
return jsonb_build_object('status','approved','workspace_id',v_workspace,'member_id',v_member.id);
end; $$;