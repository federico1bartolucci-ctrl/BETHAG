begin;

-- Snapshot of Production function definitions/EXECUTE ACLs where QA differed on 2026-10-11.

-- Generated from catalog comparison; does not alter table data.

CREATE OR REPLACE FUNCTION private.apply_portal_member_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  member_role text;
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
$function$;

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
$function$;

CREATE OR REPLACE FUNCTION private.can_access_resident_condominium(target_condominium uuid)
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
  );
$function$;

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
     and ((pa.user_id is not null and cm.user_id = pa.user_id) or lower(cm.email) = lower(pa.email))
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (pa.user_id = (select auth.uid()) or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;

CREATE OR REPLACE FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_outgoing_ids uuid[]; v_status text; v_scope text;
  v_open_installments numeric:=0; v_open_allocations numeric:=0; v_open_member_carryovers numeric:=0; v_open_unit_carryovers numeric:=0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.workspace_id,t.status,coalesce(t.data->>'transfer_scope','whole_property'),
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
              else array[t.outgoing_member_id] end
    into v_workspace,v_status,v_scope,v_outgoing_ids
  from public.condominium_member_transfers t where t.id=p_transfer_id;
  if v_workspace is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
  if not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
  if v_scope='ownership_share' then
    return jsonb_build_object('transfer_id',p_transfer_id,'status',v_status,'transfer_scope',v_scope,'open_installments',0,'open_allocations',0,'open_member_carryovers',0,'open_unit_carryovers',0,'open_total',0);
  end if;
  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=any(v_outgoing_ids) and coalesce(i.amount-i.paid_amount,0)>0.005;
  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations from public.condominium_expense_allocations a where a.member_id=any(v_outgoing_ids) and coalesce(a.amount-a.paid_amount,0)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_member_carryovers from public.condominium_fiscal_carryovers c where c.member_id=any(v_outgoing_ids) and abs(coalesce(c.balance,0))>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c
    join public.condominium_member_transfers t on t.id=p_transfer_id
    where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(coalesce(c.balance,0))>0.005;
  return jsonb_build_object('transfer_id',p_transfer_id,'status',v_status,'transfer_scope',v_scope,'outgoing_member_ids',to_jsonb(v_outgoing_ids),
    'open_installments',round(v_open_installments,2),'open_allocations',round(v_open_allocations,2),'open_member_carryovers',round(v_open_member_carryovers,2),'open_unit_carryovers',round(v_open_unit_carryovers,2),
    'open_total',round(v_open_installments+v_open_allocations+v_open_member_carryovers+v_open_unit_carryovers,2));
end;
$function$;

CREATE OR REPLACE FUNCTION private.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_outgoing_ids uuid[]; v_transfer_status text; v_scope text;
  v_open_installments numeric; v_open_allocations numeric; v_open_carryovers numeric; v_open_unit_carryovers numeric; v_outgoing_id uuid; v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.workspace_id,t.status,coalesce(t.data->>'transfer_scope','whole_property'),
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
              else array[t.outgoing_member_id] end
    into v_workspace,v_transfer_status,v_scope,v_outgoing_ids
  from public.condominium_member_transfers t where t.id=p_transfer_id for update;
  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
  if v_scope='ownership_share' then raise exception 'TRANSFER_QUOTA_NOT_CLOSABLE'; end if;
  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=any(v_outgoing_ids) and i.amount-i.paid_amount>0.005;
  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations from public.condominium_expense_allocations a where a.member_id=any(v_outgoing_ids) and a.amount-a.paid_amount>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=any(v_outgoing_ids) and abs(c.balance)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c
    join public.condominium_member_transfers t on t.id=p_transfer_id
    where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(c.balance)>0.005;
  if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then
    raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: i cedenti mantengono la posizione attiva finché tutte le situazioni contabili non sono chiuse';
  end if;
  foreach v_outgoing_id in array v_outgoing_ids loop
    select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=v_outgoing_id for update;
    update public.condominium_members set active=false,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','Archiviato','current_owner',false) where id=v_outgoing_id;
  end loop;
  update public.condominium_member_transfers set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),data=coalesce(data,'{}'::jsonb)||jsonb_build_object('financial_positions_closed',true) where id=p_transfer_id;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text DEFAULT 'Vendita'::text, p_notes text DEFAULT ''::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_condominium uuid; v_transfer_id uuid; v_incoming_id uuid;
  v_existing_count int; v_snapshot jsonb; v_out_data jsonb;
  v_scope text := coalesce(p_data->>'transfer_scope','whole_property');
  v_outgoing_ids uuid[] := array[p_outgoing_member_id];
  v_outgoing_id uuid;
  v_outgoing_share numeric;
  v_incoming_share numeric;
  v_incoming_members jsonb := case when jsonb_typeof(p_data->'incoming_members')='array' and jsonb_array_length(p_data->'incoming_members')>0 then p_data->'incoming_members' else jsonb_build_array(jsonb_build_object('name',p_incoming_name,'email',p_incoming_email,'ownership_share',coalesce(nullif(trim(coalesce(p_data->>'incoming_share','')),'')::numeric,100))) end;
  v_incoming_record jsonb;
  v_created_incoming_ids uuid[] := '{}'::uuid[];
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
  if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;

  select u.workspace_id,u.condominium_id into v_workspace,v_condominium
  from public.condominium_units u where u.id=p_unit_id for update;
  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived_at is not null) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;

  if v_scope not in ('whole_property','ownership_share') then raise exception 'INVALID_TRANSFER_SCOPE'; end if;

  if v_scope='whole_property' and jsonb_typeof(p_data->'outgoing_member_ids')='array' then
    select array_agg(value::uuid) into v_outgoing_ids
    from jsonb_array_elements_text(p_data->'outgoing_member_ids');
    if v_outgoing_ids is null or array_length(v_outgoing_ids,1)=0 then
      v_outgoing_ids := array[p_outgoing_member_id];
    end if;
    if not (p_outgoing_member_id = any(v_outgoing_ids)) then
      v_outgoing_ids := array_prepend(p_outgoing_member_id,v_outgoing_ids);
    end if;
  end if;

  if not exists(
    select 1 from public.condominium_members m
    where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id
      and m.active and trim(coalesce(m.data->>'role',''))='Proprietario'
      and coalesce(m.data->>'current_owner','true')='true'
      and coalesce(m.data->>'position_status','Attivo') not in ('In chiusura','Archiviato')
  ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT'; end if;

  if exists(select 1 from public.condominium_member_transfers t
    where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date and t.status in ('Confermato','Chiuso'))
  then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;

  if v_scope='whole_property' then
    if exists(
      select 1 from public.condominium_members m
      where m.id = any(v_outgoing_ids)
        and (m.condominium_id<>v_condominium or m.unit_id<>p_unit_id or not m.active
          or trim(coalesce(m.data->>'role',''))<>'Proprietario'
          or coalesce(m.data->>'current_owner','true')<>'true'
          or coalesce(m.data->>'position_status','Attivo') in ('In chiusura','Archiviato'))
    ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT'; end if;

    select count(*) into v_existing_count
    from public.condominium_members m
    where m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active and not (m.id=any(v_outgoing_ids))
      and coalesce(m.data->>'current_owner','true')='true'
      and coalesce(m.data->>'position_status','Attivo')='Attivo'
      and trim(coalesce(m.data->>'role',''))='Proprietario';
    if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;
  else
    v_outgoing_share := nullif(trim(coalesce(p_data->>'outgoing_share','')),'')::numeric;
    v_incoming_share := nullif(trim(coalesce(p_data->>'incoming_share','')),'')::numeric;
    if v_outgoing_share is null or v_incoming_share is null or v_outgoing_share <= 0 or v_incoming_share <= 0 then
      raise exception 'OWNERSHIP_SHARE_REQUIRED';
    end if;
    if v_incoming_share > v_outgoing_share + 0.0001 then
      raise exception 'OWNERSHIP_SHARE_EXCEEDS_OUTGOING';
    end if;
    select coalesce(nullif(trim(coalesce(m.data->>'ownership_share','')),'')::numeric,0)
      into v_outgoing_share
    from public.condominium_members m where m.id=p_outgoing_member_id for update;
    if v_outgoing_share <= 0 or v_incoming_share > v_outgoing_share + 0.0001 then
      raise exception 'OUTGOING_OWNERSHIP_SHARE_NOT_AVAILABLE';
    end if;
  end if;

  if jsonb_typeof(v_incoming_members) <> 'array' or jsonb_array_length(v_incoming_members)=0 then
    raise exception 'INCOMING_MEMBERS_REQUIRED';
  end if;

  if exists(
    select 1 from jsonb_array_elements(v_incoming_members) as x
    where nullif(trim(coalesce(x.value->>'name','')),'') is null
       or nullif(trim(coalesce(x.value->>'ownership_share','')),'') is null
       or (x.value->>'ownership_share')::numeric <= 0
  ) then raise exception 'INCOMING_MEMBER_DATA_INVALID'; end if;

  select coalesce(sum((x.value->>'ownership_share')::numeric),0) into v_incoming_share
  from jsonb_array_elements(v_incoming_members) as x;

  if v_scope='whole_property' and abs(v_incoming_share-100) > 0.0001 then
    raise exception 'INCOMING_OWNERSHIP_SHARES_MUST_TOTAL_100';
  end if;

  if v_scope='ownership_share' then
    if v_incoming_share <= 0 or v_incoming_share > coalesce(nullif(trim(coalesce(p_data->>'incoming_share','')),'')::numeric,0) + 0.0001 then
      raise exception 'INCOMING_OWNERSHIP_SHARES_EXCEED_TRANSFERRED_SHARE';
    end if;
  end if;

  v_snapshot:=jsonb_build_object(
    'captured_at',now(),'transfer_date',p_transfer_date,'outgoing_member_id',p_outgoing_member_id,
    'outgoing_member_ids',to_jsonb(v_outgoing_ids),'unit_id',p_unit_id,'transfer_scope',v_scope,
    'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
    'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
    'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
    'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'assignment_scope',case when i.member_id is null then 'unit_unassigned' else 'member' end,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),
    'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.amount-i.paid_amount>0.005),0),
    'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id) ) and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),
    'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=any(v_outgoing_ids) and (a.due_date is null or a.due_date<=p_transfer_date)),0),
    'extraordinary_deliberated_before_due_after',coalesce((select jsonb_agg(jsonb_build_object('allocation_id',a.id,'ledger_entry_id',a.ledger_entry_id,'amount',a.amount,'paid_amount',a.paid_amount,'residual',a.amount-a.paid_amount,'due_date',a.due_date,'deliberation_date',l.deliberation_date,'description',l.description) order by l.deliberation_date,a.due_date,a.id) from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=any(v_outgoing_ids) and l.expense_type='Straordinaria' and l.deliberation_date is not null and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),'[]'::jsonb),
    'unit_unassigned_carryovers',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'balance',c.balance,'kind',c.kind,'status',c.status,'source_fiscal_year_id',c.source_fiscal_year_id,'target_fiscal_year_id',c.target_fiscal_year_id) order by c.created_at,c.id) from public.condominium_fiscal_carryovers c where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),'[]'::jsonb),
    'legal_liability_review_required',true
  );

  if v_scope='whole_property' then
    foreach v_outgoing_id in array v_outgoing_ids loop
      select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=v_outgoing_id for update;
      update public.condominium_members set active=true,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','In chiusura','current_owner',false,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type) where id=v_outgoing_id;
      update public.portal_access set active=false,updated_at=now() where member_id=v_outgoing_id;
      update public.workspace_members set active=false where workspace_id=v_workspace and condominium_id=v_condominium and legacy_id=(select m.legacy_id from public.condominium_members m where m.id=v_outgoing_id) and role='resident';
    end loop;
  end if;

  for v_incoming_record in select value from jsonb_array_elements(v_incoming_members) loop
    insert into public.condominium_members(condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at)
    values(v_condominium,null,trim(v_incoming_record->>'name'),nullif(lower(trim(coalesce(v_incoming_record->>'email',''))),''),
      'resident',true,'{}'::jsonb,
      coalesce(p_data,'{}'::jsonb)||jsonb_build_object('role','Proprietario','position_status','Attivo','current_owner',true,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type,
        'ownership_share',(v_incoming_record->>'ownership_share')::numeric),p_unit_id,now(),now())
    returning id into v_incoming_id;
    v_created_incoming_ids := array_append(v_created_incoming_ids,v_incoming_id);
  end loop;

  if v_scope='ownership_share' then
    select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=p_outgoing_member_id for update;
    update public.condominium_members
      set updated_at=now(),
          data=v_out_data||jsonb_build_object(
            'ownership_share',round(v_outgoing_share-v_incoming_share,4),
            'current_owner',true,'position_status','Attivo')
      where id=p_outgoing_member_id;
  end if;

  insert into public.condominium_member_transfers(workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data,created_by)
  values(v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object('financial_history_preserved',true,'legal_liability_review_required',true,'accounting_snapshot',v_snapshot,'outgoing_portal_deactivated',v_scope='whole_property','transfer_scope',v_scope,'outgoing_member_ids',to_jsonb(v_outgoing_ids),'incoming_ownership_share',v_incoming_share,'incoming_member_ids',to_jsonb(v_created_incoming_ids)),
    auth.uid())
  returning id into v_transfer_id;
  return v_transfer_id;
end;
$function$;

CREATE OR REPLACE FUNCTION private.get_my_workspace_access()
 RETURNS TABLE(workspace_id uuid, role text, permissions jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    wm.workspace_id,
    wm.role,
    coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$function$;

CREATE OR REPLACE FUNCTION private.is_workspace_admin(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and wm.role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_workspace_manager(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.active = true
      and wm.role in ('admin','collaborator')
  );
$function$;

CREATE OR REPLACE FUNCTION private.sync_portal_after_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_old_workspace uuid;
 v_new_workspace uuid;
begin
 select c.workspace_id into v_old_workspace from public.condominiums c where c.id=old.condominium_id;
 select c.workspace_id into v_new_workspace from public.condominiums c where c.id=coalesce(new.condominium_id,old.condominium_id);

 if tg_op='DELETE' then
   update public.portal_access set active=false,updated_at=now() where member_id=old.id;
   update public.workspace_members wm set active=false
   where wm.workspace_id=v_old_workspace and wm.user_id=old.user_id and wm.role='resident' and wm.condominium_id=old.condominium_id;
   return old;
 end if;

 if new.active=false
    or new.user_id is null
    or coalesce(new.data->>'position_status','') in ('In chiusura','Archiviato')
    or (coalesce(new.data->>'role','')='Proprietario' and coalesce(new.data->>'current_owner','true')='false') then
   update public.portal_access set active=false,user_id=coalesce(new.user_id,user_id),updated_at=now() where member_id=new.id;
   update public.workspace_members wm set active=false
   where wm.workspace_id=v_old_workspace and wm.user_id=old.user_id and wm.role='resident' and wm.condominium_id=old.condominium_id;
   if new.user_id is distinct from old.user_id then
     update public.workspace_members wm set active=false
     where wm.workspace_id=v_new_workspace and wm.user_id=new.user_id and wm.role='resident' and wm.condominium_id=new.condominium_id;
   end if;
 else
   if old.user_id is distinct from new.user_id or old.condominium_id is distinct from new.condominium_id or v_old_workspace is distinct from v_new_workspace then
     update public.workspace_members wm set active=false
     where wm.workspace_id=v_old_workspace and wm.user_id=old.user_id and wm.role='resident' and wm.condominium_id=old.condominium_id;
   end if;
   update public.portal_access p set user_id=new.user_id,name=new.name,email=coalesce(new.email,p.email),apartment=coalesce(new.data->>'apartment',p.apartment),data=coalesce(new.data,'{}'::jsonb),updated_at=now()
   where p.member_id=new.id and p.active=true;
   update public.workspace_members wm set user_id=new.user_id,active=true
   where wm.workspace_id=v_new_workspace and wm.role='resident' and wm.condominium_id=new.condominium_id and wm.user_id=old.user_id;
 end if;

 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.audit_condominium_work_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare ws uuid;co uuid;wid uuid;act text;descr text;dat jsonb:='{}';begin if tg_op='DELETE' then ws:=old.workspace_id;co:=old.condominium_id;wid:=old.id;act:='work_deleted';descr:='Lavoro eliminato';dat:=jsonb_build_object('title',old.title,'status',old.status);elsif tg_op='INSERT' then ws:=new.workspace_id;co:=new.condominium_id;wid:=new.id;act:='work_created';descr:='Lavoro creato';dat:=jsonb_build_object('title',new.title,'status',new.status);else ws:=new.workspace_id;co:=new.condominium_id;wid:=new.id;if old.status is distinct from new.status then act:='work_status_changed';descr:='Stato del lavoro modificato';dat:=jsonb_build_object('old_status',old.status,'new_status',new.status);elsif old.approved_amount is distinct from new.approved_amount or old.estimated_amount is distinct from new.estimated_amount then act:='work_budget_changed';descr:='Importi del lavoro modificati';dat:=jsonb_build_object('old_estimated_amount',old.estimated_amount,'new_estimated_amount',new.estimated_amount,'old_approved_amount',old.approved_amount,'new_approved_amount',new.approved_amount);elsif old.supplier_id is distinct from new.supplier_id then act:='work_supplier_changed';descr:='Fornitore del lavoro modificato';dat:=jsonb_build_object('old_supplier_id',old.supplier_id,'new_supplier_id',new.supplier_id);elsif old.start_date is distinct from new.start_date or old.expected_end_date is distinct from new.expected_end_date or old.actual_end_date is distinct from new.actual_end_date then act:='work_dates_changed';descr:='Date del lavoro modificate';dat:=jsonb_build_object('old_start_date',old.start_date,'new_start_date',new.start_date,'old_expected_end_date',old.expected_end_date,'new_expected_end_date',new.expected_end_date,'old_actual_end_date',old.actual_end_date,'new_actual_end_date',new.actual_end_date);else return new;end if;end if;insert into public.condominium_audit_log(workspace_id,condominium_id,entity_type,entity_id,action,description,data) values(ws,co,'condominium_work',wid,act,descr,dat||jsonb_build_object('actor_user_id',auth.uid(),'recorded_at',now()));if tg_op='DELETE' then return old;end if;return new;end $function$;

CREATE OR REPLACE FUNCTION public.audit_condominium_work_progress_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare ws uuid;co uuid;wid uuid;pid uuid;act text;descr text;dat jsonb;begin if tg_op='DELETE' then ws:=old.workspace_id;co:=old.condominium_id;wid:=old.work_id;pid:=old.id;act:='work_progress_deleted';descr:='SAL eliminato';dat:=jsonb_build_object('progress_no',old.progress_no,'amount',old.amount,'percentage',old.percentage);elsif tg_op='INSERT' then ws:=new.workspace_id;co:=new.condominium_id;wid:=new.work_id;pid:=new.id;act:='work_progress_created';descr:='SAL registrato';dat:=jsonb_build_object('progress_no',new.progress_no,'amount',new.amount,'paid_amount',new.paid_amount,'percentage',new.percentage);else if old.amount is not distinct from new.amount and old.paid_amount is not distinct from new.paid_amount and old.percentage is not distinct from new.percentage and old.status is not distinct from new.status and old.progress_date is not distinct from new.progress_date and old.title is not distinct from new.title then return new;end if;ws:=new.workspace_id;co:=new.condominium_id;wid:=new.work_id;pid:=new.id;act:='work_progress_changed';descr:='SAL modificato';dat:=jsonb_build_object('old_amount',old.amount,'new_amount',new.amount,'old_paid_amount',old.paid_amount,'new_paid_amount',new.paid_amount,'old_percentage',old.percentage,'new_percentage',new.percentage,'old_status',old.status,'new_status',new.status);end if;insert into public.condominium_audit_log(workspace_id,condominium_id,entity_type,entity_id,action,description,data) values(ws,co,'condominium_work_progress',pid,act,descr,dat||jsonb_build_object('work_id',wid,'actor_user_id',auth.uid(),'recorded_at',now()));if tg_op='DELETE' then return old;end if;return new;end $function$;

CREATE OR REPLACE FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  return private.check_condominium_member_transfer_closure(p_transfer_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.claim_first_workspace_admin(p_workspace_id);
$function$;

CREATE OR REPLACE FUNCTION public.clean_deleted_member_owner_references()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.legacy_id is not null then
    update public.condominium_units as u
    set data = jsonb_set(
      coalesce(u.data, '{}'::jsonb),
      '{ownerMemberIds}',
      coalesce((
        select jsonb_agg(e.elem order by e.ord)
        from jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
            then u.data->'ownerMemberIds'
            else '[]'::jsonb
          end
        ) with ordinality as e(elem, ord)
        where e.elem #>> '{}' <> old.legacy_id::text
      ), '[]'::jsonb),
      true
    ),
    updated_at = pg_catalog.now()
    from public.condominiums as c
    where c.id = u.condominium_id
      and c.id = old.condominium_id
      and u.workspace_id = c.workspace_id
      and pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
      and exists (
        select 1
        from pg_catalog.jsonb_array_elements(u.data->'ownerMemberIds') as e(elem)
        where e.elem #>> '{}' = old.legacy_id::text
      );
  end if;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return private.close_condominium_member_transfer(p_transfer_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_intake public.condominium_allocation_intakes%rowtype;
 v_row jsonb;
 v_count integer:=0;
 v_unit_id uuid;
 v_amount numeric;
 v_millesimi numeric;
 v_total numeric:=0;
 v_total_millesimi numeric:=0;
 v_expense_amount numeric;
 v_table_total numeric;
 v_table_scope text;
 v_expected_millesimi numeric;
 v_building_code text;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;

 select * into v_intake from public.condominium_allocation_intakes
 where id=p_intake_id and workspace_id=p_workspace_id for update;

 if not found then raise exception 'Acquisizione riparto non trovata'; end if;
 if v_intake.status='Confermato' then
   return (select count(*) from public.condominium_expense_allocations where workspace_id=p_workspace_id and ledger_entry_id=v_intake.ledger_entry_id);
 end if;
 if v_intake.status='Annullato' then raise exception 'L''acquisizione è stata annullata'; end if;
 if coalesce(jsonb_array_length(v_intake.validation_errors),0)>0 then raise exception 'Il riparto contiene errori di validazione e non può essere confermato'; end if;
 if v_intake.ledger_entry_id is null then raise exception 'Collegare prima una spesa contabile'; end if;
 if coalesce(jsonb_array_length(v_intake.rows),0)=0 then raise exception 'Nessuna quota da confermare'; end if;

 select amount into v_expense_amount from public.condominium_ledger_entries
 where id=v_intake.ledger_entry_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and direction='Uscita';
 if v_expense_amount is null then raise exception 'La spesa collegata non è valida'; end if;
 if v_intake.expense_amount is not null and abs(v_intake.expense_amount-v_expense_amount)>0.005 then raise exception 'L''importo dell''acquisizione non coincide con la spesa contabile'; end if;

 if v_intake.allocation_table_id is not null then
   select total_millesimi,scope_mode into v_table_total,v_table_scope
   from public.condominium_millesimal_tables
   where id=v_intake.allocation_table_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and active=true;
   if not found then raise exception 'La tabella millesimale selezionata non è valida'; end if;
 end if;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round(coalesce((v_row->>'amount')::numeric,0),2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   if v_unit_id is null or v_amount<=0 or v_millesimi<0 then raise exception 'Riga di riparto non valida'; end if;
   if not exists(select 1 from public.condominium_units where id=v_unit_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id) then raise exception 'L''unità indicata non appartiene al condominio'; end if;

   if v_intake.allocation_table_id is not null then
     if v_table_scope='units' and not exists(select 1 from public.condominium_millesimal_tables t where t.id=v_intake.allocation_table_id and v_unit_id=any(t.scope_unit_ids)) then raise exception 'L''unità % non rientra nell''ambito della tabella millesimale selezionata',v_unit_id; end if;
     if v_table_scope='buildings' then
       select lower(trim(coalesce(data->>'building_code',data->>'civic_code',data->>'fabbricato',''))) into v_building_code from public.condominium_units where id=v_unit_id;
       if not exists(select 1 from public.condominium_millesimal_tables t cross join lateral unnest(t.scope_building_codes) as codes(code) where t.id=v_intake.allocation_table_id and lower(trim(codes.code))=v_building_code) then raise exception 'L''unità % non rientra nell''ambito per fabbricato/civico della tabella selezionata',v_unit_id; end if;
     end if;
     select value into v_expected_millesimi from public.condominium_millesimal_values where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and table_id=v_intake.allocation_table_id and unit_id=v_unit_id limit 1;
     if v_expected_millesimi is not null and abs(v_expected_millesimi-v_millesimi)>0.005 then raise exception 'I millesimi dell''unità % non coincidono con la tabella selezionata',v_unit_id; end if;
   end if;

   v_total:=v_total+v_amount; v_total_millesimi:=v_total_millesimi+v_millesimi; v_count:=v_count+1;
 end loop;

 if abs(v_total-v_expense_amount)>0.005 then raise exception 'La somma delle quote (%s) non coincide con la spesa (%s)',round(v_total,2),round(v_expense_amount,2); end if;
 if v_intake.allocation_table_id is not null and v_table_total is not null and abs(v_total_millesimi-v_table_total)>0.01 then raise exception 'I millesimi del riparto (%s) non coincidono con il totale della tabella (%s)',round(v_total_millesimi,3),round(v_table_total,3); end if;

 delete from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and ledger_entry_id=v_intake.ledger_entry_id;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round((v_row->>'amount')::numeric,2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   insert into public.condominium_expense_allocations(workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
   values(p_workspace_id,v_intake.condominium_id,v_intake.ledger_entry_id,v_intake.allocation_table_id,v_unit_id,null,
          case when v_intake.source='AI' then 'AI - confermato' else 'Manuale - confermato' end,
          v_millesimi,v_amount,0,(select due_date from public.condominium_ledger_entries where id=v_intake.ledger_entry_id),'Da pagare',coalesce(v_intake.notes,''));
 end loop;

 update public.condominium_allocation_intakes
 set status='Confermato',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id and workspace_id=p_workspace_id;

 return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_table_millesimal_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if NEW.active then
    insert into public.condominium_millesimal_values
      (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
    select NEW.workspace_id, NEW.condominium_id, NEW.id, u.id, 0, false, ''
    from public.condominium_units u
    where u.condominium_id = NEW.condominium_id and u.workspace_id = NEW.workspace_id
    on conflict (workspace_id, table_id, unit_id) do nothing;
  end if;
  return NEW;
end; $function$;

CREATE OR REPLACE FUNCTION public.ensure_unit_millesimal_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.condominium_millesimal_values
    (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
  select NEW.workspace_id, NEW.condominium_id, t.id, NEW.id, 0, false, ''
  from public.condominium_millesimal_tables t
  where t.condominium_id = NEW.condominium_id and t.workspace_id = NEW.workspace_id and t.active
  on conflict (workspace_id, table_id, unit_id) do nothing;
  return NEW;
end; $function$;

CREATE OR REPLACE FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date DEFAULT NULL::date)
 RETURNS TABLE(unit_id uuid, millesimi numeric, amount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_entry public.condominium_ledger_entries%rowtype;
  v_table public.condominium_millesimal_tables%rowtype;
  v_expense numeric;
  v_due_date date;
  v_total numeric;
  v_unit_count integer;
  v_value_count integer;
  v_installments integer;
  v_other_allocations integer;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_entry
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id
  for update;

  if not found or v_entry.direction<>'Uscita' or coalesce(v_entry.amount,0)<=0 then
    raise exception 'Spesa non valida o non appartenente al condominio';
  end if;

  select * into v_table
  from public.condominium_millesimal_tables
  where id=p_table_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and active=true;

  if not found then raise exception 'Tabella millesimale non valida o non attiva'; end if;

  v_installments := (
    select count(*) from public.condominium_installments
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id
  );
  if v_installments>0 then
    raise exception 'La spesa ha già rate collegate: modifica o elimina prima le rate per poter rigenerare la ripartizione';
  end if;

  v_other_allocations := (
    select count(*) from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
      and allocation_table_id is distinct from p_table_id
  );
  if v_other_allocations>0 then
    raise exception 'La spesa è già ripartita con un''altra tabella: elimina prima il riparto esistente per evitare una doppia imputazione';
  end if;

  v_expense:=round(v_entry.amount::numeric,2);
  v_due_date:=coalesce(p_due_date,v_entry.due_date);

  v_unit_count := (
    select count(*) from public.condominium_units u
    where u.workspace_id=p_workspace_id and u.condominium_id=p_condominium_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_unit_count=0 then raise exception 'Il criterio di riparto non contiene unità eleggibili'; end if;

  v_value_count := (
    select count(*) from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_value_count<>v_unit_count then
    raise exception 'Tabella millesimale incompleta: inserire una quota per ogni unità prevista dal criterio';
  end if;

  v_total := (
    select coalesce(sum(v.value),0)
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_total<=0 then raise exception 'Nessuna quota millesimale eleggibile'; end if;
  if abs(v_total-coalesce(v_table.total_millesimi,0))>0.001 then
    raise exception 'La somma delle quote millesimali del criterio non coincide con il totale della tabella';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id and allocation_table_id=p_table_id;

  return query
  with eligible as (
    select v.unit_id eligible_unit_id,v.value::numeric eligible_millesimi,
           v_expense*v.value::numeric/v_total exact_amount
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id
      and v.table_id=p_table_id and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  ), rounded as (
    select e.*,floor(e.exact_amount*100)/100 base_amount,
           e.exact_amount-floor(e.exact_amount*100)/100 remainder from eligible e
  ), delta as (
    select round(v_expense*100)-round(coalesce(sum(r.base_amount),0)*100) cents from rounded r
  ), ranked as (
    select r.*,row_number() over(order by r.remainder desc,r.eligible_unit_id) rn from rounded r
  ), final_amounts as (
    select r.eligible_unit_id final_unit_id,r.eligible_millesimi final_millesimi,
           r.base_amount+case when r.rn <= greatest((select cents from delta),0) then 0.01 else 0 end final_amount
    from ranked r
  )
  insert into public.condominium_expense_allocations(
    workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,
    allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
  )
  select p_workspace_id,p_condominium_id,p_ledger_entry_id,p_table_id,
         f.final_unit_id,null,v_table.basis_type,f.final_millesimi,f.final_amount,
         0,v_due_date,'Da pagare','Generata automaticamente secondo il criterio configurato'
  from final_amounts f
  returning condominium_expense_allocations.unit_id,
            condominium_expense_allocations.millesimi,
            condominium_expense_allocations.amount;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_expense public.condominium_ledger_entries%rowtype;
  v_total_weight numeric;
  v_total_cents bigint;
  v_used_cents bigint := 0;
  v_alloc_cents bigint;
  v_idx integer := 0;
  v_count integer;
  v_rows integer;
  v_row record;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if trim(coalesce(p_service_type,''))='' then
    raise exception 'Servizio di consumo obbligatorio';
  end if;

  select * into v_expense
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Spesa non trovata';
  end if;

  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then
    raise exception 'Il movimento selezionato non è una spesa valida';
  end if;

  if exists(
    select 1 from public.condominium_fiscal_years
    where id=p_fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and status='Chiuso'
  ) then
    raise exception 'L''esercizio contabile è chiuso';
  end if;

  if not exists(
    select 1 from public.condominium_fiscal_years
    where id=p_fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
  ) then
    raise exception 'Esercizio contabile non valido';
  end if;

  if exists(
    select 1 from public.condominium_installments
    where workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
  ) then
    raise exception 'La spesa ha già rate collegate';
  end if;

  select count(*), coalesce(sum(w.weight),0)
  into v_count,v_total_weight
  from (
    select r.unit_id,
      sum(
        coalesce(
          nullif(r.charge_amount,0),
          nullif(r.allocation_value,0),
          nullif(r.consumption,0),
          nullif(r.kwh,0),
          0
        )
      ) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
  ) w;

  if v_count=0 then
    raise exception 'Nessun dato di consumo disponibile per il servizio selezionato';
  end if;

  if v_total_weight<=0 then
    raise exception 'I dati di consumo non contengono un valore utile al riparto';
  end if;

  v_total_cents:=round(v_expense.amount*100);

  select count(*) into v_rows
  from (
    select r.unit_id
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
  ) q;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id;

  for v_row in
    select r.unit_id,u.unit_code,
      sum(
        coalesce(
          nullif(r.charge_amount,0),
          nullif(r.allocation_value,0),
          nullif(r.consumption,0),
          nullif(r.kwh,0),
          0
        )
      ) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id,u.unit_code
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
    order by u.unit_code
  loop
    v_idx:=v_idx+1;

    if v_idx=v_rows then
      v_alloc_cents:=v_total_cents-v_used_cents;
    else
      v_alloc_cents:=floor(v_total_cents*v_row.weight/v_total_weight);
    end if;

    if v_alloc_cents<0 then
      raise exception 'Importo di riparto non valido';
    end if;

    v_used_cents:=v_used_cents+v_alloc_cents;

    insert into public.condominium_expense_allocations(
      workspace_id,condominium_id,ledger_entry_id,unit_id,
      allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
    )
    values(
      p_workspace_id,p_condominium_id,p_ledger_entry_id,v_row.unit_id,
      'Consumo - '||trim(p_service_type),v_row.weight,
      v_alloc_cents/100.0,0,v_expense.due_date,'Da pagare',
      'Riparto generato dai dati di consumo inseriti/importati in BETHAG; letture aggregate per unità.'
    );
  end loop;

  return v_rows;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_workspace_access()
 RETURNS TABLE(workspace_id uuid, role text, permissions jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    wm.workspace_id,
    wm.role,
    coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.guard_confirmed_unit_transformation_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if old.status='Confermata' then raise exception 'CONFIRMED_TRANSFORMATION_IMMUTABLE: una trasformazione confermata è immodificabile'; end if; return case when tg_op='DELETE' then old else new end; end $function$;

CREATE OR REPLACE FUNCTION public.guard_confirmed_unit_transformation_items_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if tg_op<>'INSERT' and exists(select 1 from public.condominium_unit_transformations where id=old.transformation_id and status='Confermata') then raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili'; end if; if tg_op<>'DELETE' and exists(select 1 from public.condominium_unit_transformations where id=new.transformation_id and status='Confermata') then raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili'; end if; return case when tg_op='DELETE' then old else new end; end $function$;

CREATE OR REPLACE FUNCTION public.guard_consumption_reading_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and l.fiscal_year_id=old.fiscal_year_id and a.allocation_basis='Consumo - '||trim(old.service_type) and a.unit_id=old.unit_id) then raise exception 'La lettura di consumo è già utilizzata in un riparto e non può essere modificata o cancellata'; end if; return case when tg_op='DELETE' then old else new end; end; $function$;

CREATE OR REPLACE FUNCTION public.guard_expense_allocation_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_op='DELETE' then
    if coalesce(old.paid_amount,0)>0.005 then
      raise exception 'La ripartizione ha pagamenti registrati e non può essere cancellata';
    end if;
    if exists(
      select 1 from public.condominium_installments i
      where i.workspace_id=old.workspace_id
        and i.condominium_id=old.condominium_id
        and i.ledger_entry_id=old.ledger_entry_id
    ) then
      raise exception 'La ripartizione è collegata a rate e non può essere cancellata';
    end if;
    return old;
  end if;

  if tg_op='UPDATE' then
    if new.paid_amount is distinct from old.paid_amount
       and current_setting('bethag.allow_allocation_paid_update',true) is distinct from 'on' then
      raise exception 'Il pagato della ripartizione viene aggiornato esclusivamente dai movimenti di pagamento';
    end if;

    if coalesce(old.paid_amount,0)>0.005
       and (
         new.amount is distinct from old.amount
         or new.unit_id is distinct from old.unit_id
         or new.member_id is distinct from old.member_id
         or new.ledger_entry_id is distinct from old.ledger_entry_id
         or new.condominium_id is distinct from old.condominium_id
         or new.workspace_id is distinct from old.workspace_id
       ) then
      raise exception 'Una ripartizione con pagamenti registrati non può essere scollegata o modificata nei dati contabili';
    end if;

    if exists(
      select 1 from public.condominium_installments i
      where i.workspace_id=old.workspace_id
        and i.condominium_id=old.condominium_id
        and i.ledger_entry_id=old.ledger_entry_id
    ) and (
      new.amount is distinct from old.amount
      or new.unit_id is distinct from old.unit_id
      or new.member_id is distinct from old.member_id
      or new.ledger_entry_id is distinct from old.ledger_entry_id
      or new.condominium_id is distinct from old.condominium_id
      or new.workspace_id is distinct from old.workspace_id
    ) then
      raise exception 'Una ripartizione collegata a rate non può essere scollegata o modificata nei dati contabili';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_fiscal_year_opening_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.opening_balance is distinct from old.opening_balance and exists(select 1 from public.condominium_fiscal_carryovers c where c.workspace_id=old.workspace_id and c.condominium_id=old.condominium_id and c.target_fiscal_year_id=old.id) then raise exception 'Il saldo iniziale è vincolato ai riporti dell''esercizio precedente e non può essere modificato manualmente'; end if; return new; end; $function$;

CREATE OR REPLACE FUNCTION public.guard_fund_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if new.target_amount is null or new.target_amount < 0
     or new.allocated_amount is null or new.allocated_amount < 0
     or new.used_amount is null or new.used_amount < 0 then
    raise exception 'Gli importi del fondo devono essere numerici e non negativi';
  end if;

  if tg_op = 'UPDATE'
     and new.used_amount is distinct from old.used_amount
     and coalesce(current_setting('bethag.allow_fund_used_update', true), 'off') <> 'on' then
    raise exception 'L''importo utilizzato del fondo è calcolato automaticamente dalla contabilità e non può essere modificato manualmente';
  end if;

  if new.used_amount > new.allocated_amount + 0.005 then
    raise exception 'L''importo utilizzato non può superare l''importo allocato';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_installment_paid_amount_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if tg_op='UPDATE' and new.paid_amount is distinct from old.paid_amount and coalesce(current_setting('bethag.allow_installment_paid_update',true),'off') <> 'on' then
  raise exception 'Il totale pagato della rata può essere modificato esclusivamente tramite la registrazione di un movimento di pagamento';
 end if;
 if tg_op='UPDATE' and coalesce(old.paid_amount,0)>0 and (new.amount is distinct from old.amount or new.unit_id is distinct from old.unit_id or new.ledger_entry_id is distinct from old.ledger_entry_id or new.fiscal_year_id is distinct from old.fiscal_year_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then
  raise exception 'Una rata con pagamenti registrati non può modificare importo, unità, esercizio o collegamento contabile';
 end if;
 return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.guard_ledger_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where ledger_entry_id=old.id) then raise exception 'La voce contabile ha ripartizioni collegate e non può essere cancellata'; end if; return old; end; $function$;

CREATE OR REPLACE FUNCTION public.guard_millesimal_table_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_allocations integer:=0;
begin
 select count(*) into v_allocations from public.condominium_expense_allocations a where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and a.allocation_table_id=old.id;
 if tg_op='DELETE' and v_allocations>0 then raise exception 'La tabella millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata'; end if;
 if tg_op='UPDATE' and v_allocations>0 and (new.basis_type is distinct from old.basis_type or new.scope_mode is distinct from old.scope_mode or new.scope_unit_ids is distinct from old.scope_unit_ids or new.scope_building_codes is distinct from old.scope_building_codes or new.total_millesimi is distinct from old.total_millesimi or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then raise exception 'La tabella millesimale è già utilizzata da ripartizioni esistenti e la base di calcolo non può essere modificata'; end if;
 return coalesce(new,old);
end; $function$;

CREATE OR REPLACE FUNCTION public.guard_millesimal_table_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where allocation_table_id=old.id) then raise exception 'La tabella millesimale ha ripartizioni collegate e non può essere cancellata'; end if; if exists(select 1 from public.condominium_millesimal_values where table_id=old.id) then raise exception 'La tabella millesimale ha quote collegate e non può essere cancellata'; end if; return old; end; $function$;

CREATE OR REPLACE FUNCTION public.guard_millesimal_value_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_allocations integer:=0;
begin
 select count(*) into v_allocations from public.condominium_expense_allocations a where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and a.allocation_table_id=old.table_id;
 if tg_op='DELETE' and v_allocations>0 then raise exception 'La quota millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata'; end if;
 if tg_op='UPDATE' and v_allocations>0 and (new.value is distinct from old.value or new.excluded is distinct from old.excluded or new.table_id is distinct from old.table_id or new.unit_id is distinct from old.unit_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then raise exception 'La quota millesimale è già utilizzata da ripartizioni esistenti e non può essere modificata'; end if;
 return coalesce(new,old);
end; $function$;

CREATE OR REPLACE FUNCTION public.normalize_zero_ownership_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_share numeric;
begin
  v_share := nullif(trim(coalesce(new.data->>'ownership_share','')), '')::numeric;
  if v_share is not null and v_share <= 0 then
    new.data := coalesce(new.data,'{}'::jsonb)
      || jsonb_build_object('ownership_share',0,'current_owner',false,'position_status','In chiusura');
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.preserve_closing_condominium_member_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if lower(trim(coalesce(new.data->>'position_status', ''))) = 'in chiusura' then
    new.active := true;
    new.data := coalesce(new.data, '{}'::jsonb)
      || jsonb_build_object('current_owner', false);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_financial_unit_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_alloc integer; v_inst integer;
begin
  select count(*) into v_alloc from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  select count(*) into v_inst from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  if v_alloc>0 or v_inst>0 then
    raise exception 'L''unità ha movimenti contabili o rate collegate e non può essere eliminata';
  end if;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_fiscal_year_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_count bigint;
begin
 select count(*) into v_count from public.condominium_ledger_entries where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene movimenti contabili'; end if;
 select count(*) into v_count from public.condominium_installments where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene rate'; end if;
 select count(*) into v_count from public.condominium_budgets where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene voci di preventivo'; end if;
 select count(*) into v_count from public.condominium_consumption_readings where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene dati di consumo'; end if;
 select count(*) into v_count from public.condominium_fiscal_carryovers where source_fiscal_year_id=old.id or target_fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: esistono partite riportate collegate'; end if;
 if old.status='Chiuso' then raise exception 'Un esercizio chiuso non può essere cancellato'; end if;
 return old;
end; $function$;

CREATE OR REPLACE FUNCTION public.require_trusted_unit_transformation_confirmation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.status='Confermata' and (tg_op='INSERT' or old.status is distinct from 'Confermata') and current_user<>'postgres' then raise exception 'UNIT_TRANSFORMATION_CONFIRMATION_REQUIRES_TRUSTED_RPC: la conferma deve avvenire tramite una procedura transazionale autorizzata'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.sync_condominium_fund_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_old_fund uuid;
  v_new_fund uuid;
  v_fund uuid;
  v_used numeric;
begin
  v_old_fund := case when tg_op in ('UPDATE','DELETE') then old.fund_id else null end;
  v_new_fund := case when tg_op in ('INSERT','UPDATE') then new.fund_id else null end;

  if v_old_fund is not null and v_new_fund is not null and v_old_fund <> v_new_fund then
    if v_old_fund < v_new_fund then
      perform 1 from public.condominium_funds where id = v_old_fund for update;
      perform 1 from public.condominium_funds where id = v_new_fund for update;
    else
      perform 1 from public.condominium_funds where id = v_new_fund for update;
      perform 1 from public.condominium_funds where id = v_old_fund for update;
    end if;
  else
    v_fund := coalesce(v_new_fund, v_old_fund);
    if v_fund is not null then
      perform 1 from public.condominium_funds where id = v_fund for update;
    end if;
  end if;

  if v_old_fund is not null then
    select coalesce(sum(case when direction = 'Uscita' then amount else 0 end),0)
      into v_used
    from public.condominium_ledger_entries
    where fund_id = v_old_fund;

    perform set_config('bethag.allow_fund_used_update','on',true);
    update public.condominium_funds
       set used_amount = greatest(v_used,0),
           updated_at = now()
     where id = v_old_fund;
  end if;

  if v_new_fund is not null and v_new_fund is distinct from v_old_fund then
    select coalesce(sum(case when direction = 'Uscita' then amount else 0 end),0)
      into v_used
    from public.condominium_ledger_entries
    where fund_id = v_new_fund;

    perform set_config('bethag.allow_fund_used_update','on',true);
    update public.condominium_funds
       set used_amount = greatest(v_used,0),
           updated_at = now()
     where id = v_new_fund;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_condominium_work_financial_summary(p_work_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare a numeric:=0;p numeric:=0;q numeric:=0;s text:='Nessun importo';begin if p_work_id is null then return;end if;perform 1 from public.condominium_works where id=p_work_id for update;if not found then return;end if;select coalesce(sum(amount),0),coalesce(sum(paid_amount),0),coalesce((select percentage from public.condominium_work_progress where work_id=p_work_id order by progress_date desc,progress_no desc,created_at desc limit 1),0) into a,p,q from public.condominium_work_progress where work_id=p_work_id;p:=least(greatest(round(p,2),0),round(a,2));if a<=0 then s:='Nessun importo';elsif p>=a-0.005 then s:='Pagato';elsif p>0 then s:='Parzialmente pagato';else s:='Da pagare';end if;update public.condominium_works set actual_amount=round(a,2),paid_amount=p,remaining_amount=greatest(round(a-p,2),0),progress_percent=least(greatest(q,0),100),payment_status=s,updated_at=now() where id=p_work_id;end $function$;

CREATE OR REPLACE FUNCTION public.sync_condominium_work_financial_summary_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if tg_op='DELETE' then perform public.sync_condominium_work_financial_summary(old.work_id);return old;end if;perform public.sync_condominium_work_financial_summary(new.work_id);if tg_op='UPDATE' and old.work_id is distinct from new.work_id then perform public.sync_condominium_work_financial_summary(old.work_id);end if;return new;end $function$;

CREATE OR REPLACE FUNCTION public.validate_allocation_rule_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.allocation_table_id is null then raise exception 'Una regola di riparto deve indicare una tabella millesimale'; end if; if not exists(select 1 from public.condominium_millesimal_tables t where t.id=new.allocation_table_id and t.workspace_id=new.workspace_id and t.condominium_id=new.condominium_id) then raise exception 'La tabella della regola di riparto non appartiene al condominio selezionato'; end if; if new.priority is null or new.priority<0 then raise exception 'La priorità della regola di riparto non può essere negativa'; end if; if coalesce(trim(new.name),'')='' then raise exception 'Il nome della regola di riparto è obbligatorio'; end if; if coalesce(trim(new.expense_type),'')='' and coalesce(trim(new.category),'')='' then raise exception 'La regola deve indicare almeno il tipo di spesa o la categoria'; end if; return new; end; $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_legal_case_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare w uuid; begin select workspace_id into w from public.condominiums where id=new.condominium_id; if w is null then raise exception 'Il condominio indicato non esiste'; end if; if new.workspace_id<>w then raise exception 'Contenzioso e condominio devono appartenere allo stesso workspace'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_tax_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare w uuid; begin select workspace_id into w from public.condominiums where id=new.condominium_id; if w is null then raise exception 'Il condominio indicato non esiste'; end if; if new.workspace_id<>w then raise exception 'Obbligo fiscale e condominio devono appartenere allo stesso workspace'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_unit_relationship()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_parent_id uuid; v_parent_condominium uuid; v_current uuid; v_depth integer:=0;
begin
  if nullif(trim(coalesce(new.data->>'incorporatedInUnitId','')), '') is null then return new; end if;
  begin v_parent_id := (new.data->>'incorporatedInUnitId')::uuid;
  exception when invalid_text_representation then raise exception 'L''unità di riferimento della pertinenza non è valida.'; end;
  if v_parent_id=new.id then raise exception 'Un''unità non può essere la propria pertinenza.'; end if;
  select condominium_id into v_parent_condominium from public.condominium_units where id=v_parent_id;
  if v_parent_condominium is null then raise exception 'L''unità principale indicata per la pertinenza non esiste.'; end if;
  if v_parent_condominium<>new.condominium_id then raise exception 'La pertinenza deve appartenere allo stesso condominio dell''unità principale.'; end if;
  v_current:=v_parent_id;
  while v_current is not null and v_depth<100 loop
    v_depth:=v_depth+1;
    if v_current=new.id then raise exception 'Collegamento circolare tra unità immobiliari non consentito.'; end if;
    select nullif(trim(coalesce(data->>'incorporatedInUnitId','')), '')::uuid into v_current from public.condominium_units where id=v_current;
  end loop;
  if v_depth>=100 then raise exception 'Catena di pertinenze non valida.'; end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_financial_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare w uuid;c uuid;begin select workspace_id,condominium_id into w,c from public.condominium_works where id=new.work_id; if new.ledger_entry_id is not null and not exists(select 1 from public.condominium_ledger_entries where id=new.ledger_entry_id and workspace_id=w and condominium_id=c) then raise exception 'Movimento contabile non coerente con il lavoro'; end if; if new.payment_entry_id is not null and not exists(select 1 from public.condominium_ledger_entries where id=new.payment_entry_id and workspace_id=w and condominium_id=c) then raise exception 'Movimento di pagamento non coerente con il lavoro'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_progress_accounting_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare w record;l record;p record;begin select workspace_id,condominium_id,supplier_id into w from public.condominium_works where id=new.work_id; if not found then raise exception 'Lavoro collegato al SAL non trovato'; end if; if new.ledger_entry_id is not null then select workspace_id,condominium_id,direction,supplier_id into l from public.condominium_ledger_entries where id=new.ledger_entry_id; if not found or l.workspace_id<>w.workspace_id or l.condominium_id<>w.condominium_id then raise exception 'Movimento contabile non coerente con il lavoro'; end if; if l.direction<>'Uscita' then raise exception 'Il movimento contabile della spesa deve essere un''Uscita'; end if; if w.supplier_id is not null and l.supplier_id is not null and w.supplier_id<>l.supplier_id then raise exception 'Il fornitore del movimento contabile non coincide con quello del lavoro'; end if; end if; if new.payment_entry_id is not null then if new.ledger_entry_id is not null and new.payment_entry_id=new.ledger_entry_id then raise exception 'Il movimento di pagamento deve essere distinto dal movimento della spesa'; end if; select workspace_id,condominium_id,direction,supplier_id,amount into p from public.condominium_ledger_entries where id=new.payment_entry_id; if not found or p.workspace_id<>w.workspace_id or p.condominium_id<>w.condominium_id then raise exception 'Movimento di pagamento non coerente con il lavoro'; end if; if p.direction<>'Uscita' then raise exception 'Il movimento di pagamento deve essere un''Uscita'; end if; if w.supplier_id is not null and p.supplier_id is not null and w.supplier_id<>p.supplier_id then raise exception 'Il fornitore del pagamento non coincide con quello del lavoro'; end if; if coalesce(new.paid_amount,0)>coalesce(p.amount,0)+0.005 then raise exception 'Il pagato del SAL supera l''importo del movimento di pagamento collegato'; end if; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_reference_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.fund_id is not null and not exists(select 1 from public.condominium_funds f where f.id=new.fund_id and f.workspace_id=new.workspace_id and f.condominium_id=new.condominium_id) then raise exception 'Fondo non coerente con il lavoro'; end if; if new.supplier_id is not null and not exists(select 1 from public.condominium_suppliers s where s.id=new.supplier_id and s.workspace_id=new.workspace_id and s.condominium_id=new.condominium_id) then raise exception 'Fornitore non coerente con il lavoro'; end if; if new.register_item_id is not null and not exists(select 1 from public.condominium_register_items r where r.id=new.register_item_id and r.workspace_id=new.workspace_id and r.condominium_id=new.condominium_id) then raise exception 'Voce registro non coerente con il lavoro'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare w uuid; a timestamptz; begin select workspace_id,archived_at into w,a from public.condominiums where id=new.condominium_id; if w is null then raise exception 'Condominio non trovato'; end if; if new.workspace_id<>w then raise exception 'Workspace del lavoro non coerente con il condominio'; end if; if a is not null then raise exception 'Non è possibile modificare lavori di un condominio archiviato'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_confirmed_unit_transformation_genealogy()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare s int; d int; v int; u int; a int; b int; begin if new.status<>'Confermata' then return new; end if; select count(*) filter(where i.direction='Fonte')::int,count(*) filter(where i.direction='Destinazione')::int,count(*) filter(where x.id is not null and x.workspace_id=new.workspace_id and x.condominium_id=new.condominium_id)::int,count(distinct i.unit_id)::int,count(*) filter(where i.direction='Fonte' and x.lifecycle_status='Attiva' and x.workspace_id=new.workspace_id and x.condominium_id=new.condominium_id)::int,count(*) filter(where i.direction='Destinazione' and x.lifecycle_status='Attiva' and x.workspace_id=new.workspace_id and x.condominium_id=new.condominium_id)::int into s,d,v,u,a,b from public.condominium_unit_transformation_items i left join public.condominium_units x on x.id=i.unit_id where i.transformation_id=new.id; if s<>new.source_unit_count or d<>new.destination_unit_count or v<>s+d or u<>s+d then raise exception 'UNIT_TRANSFORMATION_GENEALOGY_MISMATCH'; end if; if a<>s or b<>d then raise exception 'UNIT_TRANSFORMATION_UNITS_NOT_ACTIVE'; end if; if new.transformation_type='Fusione' and (s<2 or d<>1) then raise exception 'UNIT_TRANSFORMATION_FUSION_GENEALOGY_INVALID'; end if; if new.transformation_type='Frazionamento' and (s<>1 or d<2) then raise exception 'UNIT_TRANSFORMATION_SPLIT_GENEALOGY_INVALID'; end if; return new; end $function$;

CREATE OR REPLACE FUNCTION public.validate_unit_owner_member_refs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_owner text;
  v_member_count integer;
begin
  if jsonb_typeof(coalesce(new.data->'ownerMemberIds','[]'::jsonb)) <> 'array' then
    raise exception 'OWNER_REFS_INVALID: ownerMemberIds deve essere un array';
  end if;

  for v_owner in
    select value
    from jsonb_array_elements_text(coalesce(new.data->'ownerMemberIds','[]'::jsonb))
  loop
    select count(*)
    into v_member_count
    from public.condominium_members m
    where m.condominium_id=new.condominium_id
      and m.unit_id=new.id
      and m.legacy_id::text=v_owner
      and coalesce(m.data->>'role','')='Proprietario';

    if v_member_count<>1 then
      raise exception
        'OWNER_REF_INVALID: il proprietario % non appartiene all''unità, al condominio o non è qualificato come Proprietario',
        v_owner;
    end if;
  end loop;

  return new;
end;
$function$;

revoke all on function private.apply_portal_member_permissions() from public, anon, authenticated, service_role;

revoke all on function private.can_access_condominium(target_condominium uuid) from public, anon, authenticated, service_role;

grant execute on function private.can_access_condominium(target_condominium uuid) to "authenticated";

grant execute on function private.can_access_condominium(target_condominium uuid) to "service_role";

revoke all on function private.can_access_resident_condominium(target_condominium uuid) from public, anon, authenticated, service_role;

grant execute on function private.can_access_resident_condominium(target_condominium uuid) to "authenticated";

revoke all on function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text) from public, anon, authenticated, service_role;

grant execute on function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text) to "authenticated";

revoke all on function private.check_condominium_member_transfer_closure(p_transfer_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.check_condominium_member_transfer_closure(p_transfer_id uuid) to PUBLIC;

revoke all on function private.close_condominium_member_transfer(p_transfer_id uuid) from public, anon, authenticated, service_role;

revoke all on function private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) from public, anon, authenticated, service_role;

grant execute on function private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) to "authenticated";

revoke all on function private.get_my_workspace_access() from public, anon, authenticated, service_role;

grant execute on function private.get_my_workspace_access() to "authenticated";

revoke all on function private.is_workspace_admin(target_workspace uuid) from public, anon, authenticated, service_role;

grant execute on function private.is_workspace_admin(target_workspace uuid) to "authenticated";

grant execute on function private.is_workspace_admin(target_workspace uuid) to "service_role";

revoke all on function private.is_workspace_manager(target_workspace uuid) from public, anon, authenticated, service_role;

revoke all on function private.sync_portal_after_member_change() from public, anon, authenticated, service_role;

revoke all on function public.audit_condominium_work_change() from public, anon, authenticated, service_role;

grant execute on function public.audit_condominium_work_change() to "service_role";

revoke all on function public.audit_condominium_work_progress_change() from public, anon, authenticated, service_role;

grant execute on function public.audit_condominium_work_progress_change() to "service_role";

revoke all on function public.check_condominium_member_transfer_closure(p_transfer_id uuid) from public, anon, authenticated, service_role;

grant execute on function public.check_condominium_member_transfer_closure(p_transfer_id uuid) to PUBLIC;

grant execute on function public.check_condominium_member_transfer_closure(p_transfer_id uuid) to "authenticated";

grant execute on function public.check_condominium_member_transfer_closure(p_transfer_id uuid) to "service_role";

revoke all on function public.claim_first_workspace_admin(p_workspace_id uuid) from public, anon, authenticated, service_role;

grant execute on function public.claim_first_workspace_admin(p_workspace_id uuid) to "authenticated";

grant execute on function public.claim_first_workspace_admin(p_workspace_id uuid) to "service_role";

revoke all on function public.clean_deleted_member_owner_references() from public, anon, authenticated, service_role;

revoke all on function public.close_condominium_member_transfer(p_transfer_id uuid) from public, anon, authenticated, service_role;

grant execute on function public.close_condominium_member_transfer(p_transfer_id uuid) to "authenticated";

grant execute on function public.close_condominium_member_transfer(p_transfer_id uuid) to "service_role";

revoke all on function public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) from public, anon, authenticated, service_role;

grant execute on function public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) to "authenticated";

grant execute on function public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) to "service_role";

revoke all on function public.ensure_table_millesimal_values() from public, anon, authenticated, service_role;

grant execute on function public.ensure_table_millesimal_values() to "service_role";

revoke all on function public.ensure_unit_millesimal_values() from public, anon, authenticated, service_role;

grant execute on function public.ensure_unit_millesimal_values() to "service_role";

revoke all on function public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) from public, anon, authenticated, service_role;

grant execute on function public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) to "authenticated";

grant execute on function public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) to "service_role";

revoke all on function public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) from public, anon, authenticated, service_role;

grant execute on function public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) to "authenticated";

grant execute on function public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) to "service_role";

revoke all on function public.get_my_workspace_access() from public, anon, authenticated, service_role;

grant execute on function public.get_my_workspace_access() to "authenticated";

grant execute on function public.get_my_workspace_access() to "service_role";

revoke all on function public.guard_confirmed_unit_transformation_immutable() from public, anon, authenticated, service_role;

grant execute on function public.guard_confirmed_unit_transformation_immutable() to "service_role";

revoke all on function public.guard_confirmed_unit_transformation_items_immutable() from public, anon, authenticated, service_role;

grant execute on function public.guard_confirmed_unit_transformation_items_immutable() to "service_role";

revoke all on function public.guard_consumption_reading_integrity() from public, anon, authenticated, service_role;

grant execute on function public.guard_consumption_reading_integrity() to "service_role";

revoke all on function public.guard_expense_allocation_integrity() from public, anon, authenticated, service_role;

grant execute on function public.guard_expense_allocation_integrity() to "service_role";

revoke all on function public.guard_fiscal_year_opening_balance() from public, anon, authenticated, service_role;

grant execute on function public.guard_fiscal_year_opening_balance() to "service_role";

revoke all on function public.guard_fund_integrity() from public, anon, authenticated, service_role;

grant execute on function public.guard_fund_integrity() to "service_role";

revoke all on function public.guard_installment_paid_amount_update() from public, anon, authenticated, service_role;

grant execute on function public.guard_installment_paid_amount_update() to "authenticated";

grant execute on function public.guard_installment_paid_amount_update() to "service_role";

revoke all on function public.guard_ledger_parent_delete() from public, anon, authenticated, service_role;

grant execute on function public.guard_ledger_parent_delete() to "authenticated";

grant execute on function public.guard_ledger_parent_delete() to "service_role";

revoke all on function public.guard_millesimal_table_integrity() from public, anon, authenticated, service_role;

grant execute on function public.guard_millesimal_table_integrity() to "authenticated";

grant execute on function public.guard_millesimal_table_integrity() to "service_role";

revoke all on function public.guard_millesimal_table_parent_delete() from public, anon, authenticated, service_role;

grant execute on function public.guard_millesimal_table_parent_delete() to "authenticated";

grant execute on function public.guard_millesimal_table_parent_delete() to "service_role";

revoke all on function public.guard_millesimal_value_integrity() from public, anon, authenticated, service_role;

grant execute on function public.guard_millesimal_value_integrity() to "authenticated";

grant execute on function public.guard_millesimal_value_integrity() to "service_role";

revoke all on function public.normalize_zero_ownership_owner() from public, anon, authenticated, service_role;

grant execute on function public.normalize_zero_ownership_owner() to PUBLIC;

grant execute on function public.normalize_zero_ownership_owner() to "service_role";

revoke all on function public.preserve_closing_condominium_member_history() from public, anon, authenticated, service_role;

grant execute on function public.preserve_closing_condominium_member_history() to PUBLIC;

grant execute on function public.preserve_closing_condominium_member_history() to "service_role";

revoke all on function public.prevent_financial_unit_delete() from public, anon, authenticated, service_role;

grant execute on function public.prevent_financial_unit_delete() to "authenticated";

grant execute on function public.prevent_financial_unit_delete() to "service_role";

revoke all on function public.prevent_fiscal_year_delete() from public, anon, authenticated, service_role;

grant execute on function public.prevent_fiscal_year_delete() to "service_role";

revoke all on function public.require_trusted_unit_transformation_confirmation() from public, anon, authenticated, service_role;

revoke all on function public.sync_condominium_fund_usage() from public, anon, authenticated, service_role;

grant execute on function public.sync_condominium_fund_usage() to "service_role";

revoke all on function public.sync_condominium_work_financial_summary(p_work_id uuid) from public, anon, authenticated, service_role;

grant execute on function public.sync_condominium_work_financial_summary(p_work_id uuid) to "service_role";

revoke all on function public.sync_condominium_work_financial_summary_trigger() from public, anon, authenticated, service_role;

grant execute on function public.sync_condominium_work_financial_summary_trigger() to "service_role";

revoke all on function public.validate_allocation_rule_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_allocation_rule_scope() to "service_role";

revoke all on function public.validate_condominium_legal_case_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_legal_case_scope() to "service_role";

revoke all on function public.validate_condominium_tax_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_tax_scope() to "service_role";

revoke all on function public.validate_condominium_unit_relationship() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_unit_relationship() to "service_role";

revoke all on function public.validate_condominium_work_financial_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_work_financial_scope() to "authenticated";

grant execute on function public.validate_condominium_work_financial_scope() to "service_role";

revoke all on function public.validate_condominium_work_progress_accounting_links() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_work_progress_accounting_links() to "service_role";

revoke all on function public.validate_condominium_work_reference_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_work_reference_scope() to "authenticated";

grant execute on function public.validate_condominium_work_reference_scope() to "service_role";

revoke all on function public.validate_condominium_work_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_work_scope() to "authenticated";

grant execute on function public.validate_condominium_work_scope() to "service_role";

revoke all on function public.validate_confirmed_unit_transformation_genealogy() from public, anon, authenticated, service_role;

revoke all on function public.validate_unit_owner_member_refs() from public, anon, authenticated, service_role;

grant execute on function public.validate_unit_owner_member_refs() to "service_role";

revoke all on function private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) from public, anon, authenticated, service_role;

grant execute on function private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) to "service_role";

revoke all on function private.can_access_workspace_module(target_workspace uuid, required_permission text) from public, anon, authenticated, service_role;

grant execute on function private.can_access_workspace_module(target_workspace uuid, required_permission text) to "authenticated";

revoke all on function private.can_manage_workspace_module(target_workspace uuid, required_permission text) from public, anon, authenticated, service_role;

grant execute on function private.can_manage_workspace_module(target_workspace uuid, required_permission text) to "authenticated";

revoke all on function private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) to "service_role";

revoke all on function private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) to "service_role";

revoke all on function private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) from public, anon, authenticated, service_role;

grant execute on function private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) to "service_role";

revoke all on function private.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) from public, anon, authenticated, service_role;

grant execute on function private.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) to "service_role";

revoke all on function private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) to "service_role";

revoke all on function private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) from public, anon, authenticated, service_role;

grant execute on function private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) to "service_role";

revoke all on function private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) to "service_role";

revoke all on function private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) to "service_role";

revoke all on function private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) from public, anon, authenticated, service_role;

grant execute on function private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) to "service_role";

revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;

grant execute on function private.handle_new_user() to "service_role";

revoke all on function private.is_workspace_member(target_workspace uuid) from public, anon, authenticated, service_role;

grant execute on function private.is_workspace_member(target_workspace uuid) to "authenticated";

grant execute on function private.is_workspace_member(target_workspace uuid) to "service_role";

revoke all on function private.is_workspace_staff(target_workspace uuid) from public, anon, authenticated, service_role;

grant execute on function private.is_workspace_staff(target_workspace uuid) to "service_role";

revoke all on function private.list_archived_condominiums(p_workspace_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.list_archived_condominiums(p_workspace_id uuid) to "service_role";

revoke all on function private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) from public, anon, authenticated, service_role;

grant execute on function private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) to "service_role";

revoke all on function private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) from public, anon, authenticated, service_role;

grant execute on function private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) to "service_role";

revoke all on function private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) from public, anon, authenticated, service_role;

grant execute on function private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) to "authenticated";

grant execute on function private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) to "service_role";

revoke all on function private.set_personal_security_code(p_code text, p_enabled boolean) from public, anon, authenticated, service_role;

grant execute on function private.set_personal_security_code(p_code text, p_enabled boolean) to "service_role";

revoke all on function private.verify_personal_security_code(p_code text) from public, anon, authenticated, service_role;

grant execute on function private.verify_personal_security_code(p_code text) to "service_role";

revoke all on function public.touch_documents_updated_at() from public, anon, authenticated, service_role;

grant execute on function public.touch_documents_updated_at() to "service_role";

revoke all on function public.validate_communication_recipient_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_communication_recipient_scope() to "service_role";

revoke all on function public.validate_condominium_allocation_intake_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_allocation_intake_scope() to "service_role";

revoke all on function public.validate_condominium_consumption_reading_scope() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_consumption_reading_scope() to "service_role";

revoke all on function public.validate_condominium_request_status() from public, anon, authenticated, service_role;

grant execute on function public.validate_condominium_request_status() to "service_role";

revoke all on function public.validate_document_ai_transition() from public, anon, authenticated, service_role;

grant execute on function public.validate_document_ai_transition() to "service_role";

revoke all on function public.validate_document_metadata() from public, anon, authenticated, service_role;

grant execute on function public.validate_document_metadata() to "service_role";

commit;
