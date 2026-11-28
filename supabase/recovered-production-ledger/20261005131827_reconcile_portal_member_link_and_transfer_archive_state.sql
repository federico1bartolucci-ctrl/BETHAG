-- Reconcile portal member linkage and current condominium archive storage.
create or replace function private.complete_portal_registration(
  p_full_name text, p_fiscal_code text default null, p_condominium_name text default null
) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_user_id uuid:=auth.uid(); v_email text; v_member public.condominium_members%rowtype;
v_candidate_count integer:=0; v_workspace uuid; v_request_id uuid;
begin
 if v_user_id is null then raise exception 'Autenticazione richiesta'; end if;
 select lower(trim(u.email)) into v_email from auth.users u where u.id=v_user_id and u.email_confirmed_at is not null;
 if v_email is null then raise exception 'E-mail non ancora verificata'; end if;
 select count(*) into v_candidate_count from public.condominium_members cm where cm.active=true and
 (lower(trim(cm.name))=lower(trim(p_full_name)) or
 (coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>'' and
 regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')=regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')));
 if v_candidate_count=1 then
  select cm.* into v_member from public.condominium_members cm where cm.active=true and
  (lower(trim(cm.name))=lower(trim(p_full_name)) or
  (coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>'' and
  regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')=regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'))) limit 1;
  select c.workspace_id into v_workspace from public.condominiums c where c.id=v_member.condominium_id;
  if lower(trim(coalesce(v_member.email,'')))=v_email then
   update public.condominium_members set user_id=v_user_id,updated_at=now() where id=v_member.id;
   insert into public.portal_access(workspace_id,condominium_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data,member_id)
   values(v_workspace,v_member.condominium_id,v_member.legacy_id,v_member.name,v_email,'resident',coalesce(v_member.data->>'apartment',''),'["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb,true,v_user_id,coalesce(v_member.data,'{}'::jsonb),v_member.id)
   on conflict do update set name=excluded.name,legacy_id=excluded.legacy_id,apartment=excluded.apartment,permissions=excluded.permissions,active=true,user_id=excluded.user_id,data=excluded.data,member_id=excluded.member_id,updated_at=now();
   insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id)
   values(v_workspace,v_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id)
   on conflict(workspace_id,user_id) do update set active=true,role='resident',condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
   update public.profiles set full_name=v_member.name,email=v_email,role='resident',active=true,updated_at=now() where id=v_user_id;
   update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,requested_user_id=v_user_id,reviewed_at=coalesce(reviewed_at,now()),updated_at=now() where lower(trim(email))=v_email and status in ('pending','email_mismatch');
   return jsonb_build_object('status','approved','workspace_id',v_workspace,'condominium_id',v_member.condominium_id,'member_id',v_member.id);
  end if;
  insert into public.portal_registration_requests(workspace_id,requested_user_id,email,full_name,fiscal_code,condominium_name,status,matched_member_id,note)
  values(v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),nullif(trim(p_condominium_name),''),'email_mismatch',v_member.id,'Incongruenza e-mail: e-mail dell''account diversa da quella presente nell''anagrafica del condòmino.')
  on conflict do nothing returning id into v_request_id;
  return jsonb_build_object('status','email_mismatch','request_id',v_request_id);
 end if;
 select c.workspace_id into v_workspace from public.condominiums c where p_condominium_name is not null and lower(trim(c.name))=lower(trim(p_condominium_name)) group by c.workspace_id having count(*)=1 limit 1;
 if v_workspace is null then select min(w.id) into v_workspace from public.workspaces w having count(*)=1; end if;
 insert into public.portal_registration_requests(workspace_id,requested_user_id,email,full_name,fiscal_code,condominium_name,status,note)
 values(v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),nullif(trim(p_condominium_name),''),'pending','Profilo condòmino non individuato automaticamente.')
 on conflict do nothing returning id into v_request_id;
 update public.profiles set full_name=trim(p_full_name),email=v_email,role='resident',active=true,updated_at=now() where id=v_user_id;
 return jsonb_build_object('status','pending','request_id',v_request_id);
end;$function$;

create or replace function private.confirm_condominium_member_transfer(
 p_unit_id uuid,p_outgoing_member_id uuid,p_incoming_name text,p_incoming_email text,p_incoming_user_id uuid,p_transfer_date date,
 p_transfer_type text default 'Vendita',p_notes text default '',p_data jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $function$
declare v_workspace uuid; v_condominium uuid; v_transfer_id uuid; v_incoming_id uuid; v_existing_count int; v_snapshot jsonb; v_out_data jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
 if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;
 select u.workspace_id,u.condominium_id into v_workspace,v_condominium from public.condominium_units u where u.id=p_unit_id;
 if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived_at is not null) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;
 if not exists(select 1 from public.condominium_members m where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;
 if exists(select 1 from public.condominium_member_transfers t where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date and t.status in ('Confermato','Chiuso')) then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;
 select count(*) into v_existing_count from public.condominium_members m where m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active and m.id<>p_outgoing_member_id and coalesce(m.data->>'current_owner','true')='true' and coalesce(m.data->>'position_status','Attivo')<>'In chiusura' and trim(coalesce(m.data->>'role',''))='Proprietario';
 if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;
 v_snapshot:=jsonb_build_object('captured_at',now(),'transfer_date',p_transfer_date,'outgoing_member_id',p_outgoing_member_id,'unit_id',p_unit_id,
 'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
 'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
 'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
 'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),'legal_liability_review_required',true);
 select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=p_outgoing_member_id for update;
 update public.condominium_members set active=true,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','In chiusura','current_owner',false,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type) where id=p_outgoing_member_id;
 update public.portal_access set active=false,updated_at=now() where member_id=p_outgoing_member_id;
 update public.workspace_members set active=false,updated_at=now() where workspace_id=v_workspace and condominium_id=v_condominium and legacy_id=(select m.legacy_id from public.condominium_members m where m.id=p_outgoing_member_id) and role='resident';
 insert into public.condominium_members(condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at)
 values(v_condominium,p_incoming_user_id,trim(p_incoming_name),nullif(lower(trim(coalesce(p_incoming_email,''))),''),'resident',true,'{}'::jsonb,coalesce(p_data,'{}'::jsonb)||jsonb_build_object('role','Proprietario','position_status','Attivo','current_owner',true,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type),p_unit_id,now(),now())
 returning id into v_incoming_id;
 insert into public.condominium_member_transfers(workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data,created_by)
 values(v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),coalesce(p_data,'{}'::jsonb)||jsonb_build_object('financial_history_preserved',true,'legal_liability_review_required',true,'accounting_snapshot',v_snapshot,'outgoing_portal_deactivated',true),auth.uid())
 returning id into v_transfer_id;
 return v_transfer_id;
end;$function$;


-- Keep the exposed RPC invoker-only; privileged work remains in private.
create or replace function public.complete_portal_registration(
  p_full_name text,
  p_fiscal_code text default null,
  p_condominium_name text default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $function$
begin
  return private.complete_portal_registration($1,$2,$3);
end;
$function$;

revoke execute on function public.complete_portal_registration(text,text,text) from anon, public;
grant execute on function public.complete_portal_registration(text,text,text) to authenticated;
