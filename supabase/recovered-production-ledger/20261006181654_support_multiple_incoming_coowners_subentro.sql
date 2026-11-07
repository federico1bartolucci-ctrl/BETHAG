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
  v_incoming_members jsonb := coalesce(p_data->'incoming_members','[]'::jsonb);
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
$function$
