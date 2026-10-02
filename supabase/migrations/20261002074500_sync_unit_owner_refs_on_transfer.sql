-- Keep the unit's legacy owner references aligned with a confirmed transfer.
-- This runs inside the same transaction as the member and transfer writes.
create or replace function private.confirm_condominium_member_transfer(
  p_unit_id uuid,
  p_outgoing_member_id uuid,
  p_incoming_name text,
  p_incoming_email text,
  p_incoming_user_id uuid,
  p_transfer_date date,
  p_transfer_type text default 'Vendita',
  p_notes text default '',
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_workspace uuid;
  v_condominium uuid;
  v_transfer_id uuid;
  v_incoming_id uuid;
  v_outgoing_legacy_id bigint;
  v_incoming_legacy_id bigint;
  v_snapshot jsonb;
  v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
  if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;

  select u.workspace_id,u.condominium_id into v_workspace,v_condominium
  from public.condominium_units u where u.id=p_unit_id for update;

  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived_at is not null) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;

  select m.legacy_id into v_outgoing_legacy_id
  from public.condominium_members m
  where m.id=p_outgoing_member_id and m.condominium_id=v_condominium
    and m.unit_id=p_unit_id and m.active
    and trim(coalesce(m.data->>'role',''))='Proprietario'
    and coalesce(m.data->>'current_owner','true')='true'
    and coalesce(m.data->>'position_status','Attivo') <> 'In chiusura'
  for update;

  if not found then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_CURRENT_OWNER_ON_UNIT'; end if;

  if exists(
    select 1 from public.condominium_member_transfers t
    where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date
      and t.status in ('Confermato','Chiuso')
  ) then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;

  v_snapshot := jsonb_build_object(
    'captured_at',now(),
    'transfer_date',p_transfer_date,
    'outgoing_member_id',p_outgoing_member_id,
    'unit_id',p_unit_id,
    'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),
    'legal_liability_review_required',true
  );

  select coalesce(m.data,'{}'::jsonb) into v_out_data
  from public.condominium_members m where m.id=p_outgoing_member_id for update;

  update public.condominium_members
  set active=true, updated_at=now(),
      data=v_out_data||jsonb_build_object(
        'position_status','In chiusura',
        'current_owner',false,
        'subentro_date',p_transfer_date,
        'subentro_type',p_transfer_type
      )
  where id=p_outgoing_member_id;

  update public.portal_access set active=false where member_id=p_outgoing_member_id;

  update public.workspace_members
  set active=false, updated_at=now()
  where workspace_id=v_workspace and condominium_id=v_condominium
    and legacy_id=v_outgoing_legacy_id and role='resident';

  insert into public.condominium_members(
    condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at
  )
  values(
    v_condominium,p_incoming_user_id,trim(p_incoming_name),
    nullif(lower(trim(coalesce(p_incoming_email,''))), ''),
    'resident',true,'{}'::jsonb,
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object(
      'role','Proprietario',
      'position_status','Attivo',
      'current_owner',true,
      'subentro_date',p_transfer_date,
      'subentro_type',p_transfer_type
    ),
    p_unit_id,now(),now()
  )
  returning id into v_incoming_id;

  select m.legacy_id into v_incoming_legacy_id
  from public.condominium_members m where m.id=v_incoming_id;

  if v_incoming_legacy_id is null then
    raise exception 'INCOMING_MEMBER_LEGACY_ID_MISSING';
  end if;

  -- ownerMemberIds stores legacy numeric member IDs. Preserve any co-owners,
  -- remove the outgoing member and add the incoming member exactly once.
  update public.condominium_units u
  set data=jsonb_set(
    coalesce(u.data,'{}'::jsonb),
    '{ownerMemberIds}',
    (
      select coalesce(jsonb_agg(e.value order by e.ordinality),'[]'::jsonb)
      from jsonb_array_elements(
        case when jsonb_typeof(u.data->'ownerMemberIds')='array'
          then u.data->'ownerMemberIds' else '[]'::jsonb end
      ) with ordinality as e(value,ordinality)
      where e.value <> to_jsonb(v_outgoing_legacy_id)
        and e.value <> to_jsonb(v_incoming_legacy_id)
    ) || jsonb_build_array(v_incoming_legacy_id),
    true
  ),
  updated_at=now()
  where u.id=p_unit_id;

  insert into public.condominium_member_transfers(
    workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,
    transfer_date,transfer_type,status,notes,data,created_by
  )
  values(
    v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,
    p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object(
      'financial_history_preserved',true,
      'legal_liability_review_required',true,
      'accounting_snapshot',v_snapshot,
      'outgoing_portal_deactivated',true,
      'unit_owner_references_updated',true
    ),
    auth.uid()
  )
  returning id into v_transfer_id;

  return v_transfer_id;
end;
$function$;
