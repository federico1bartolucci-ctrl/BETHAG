-- Unit-assigned allocations without a member are unit-level financial positions.
-- Include them in both the closure-check totals and the authoritative close gate.
CREATE OR REPLACE FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid;
  v_condominium uuid;
  v_unit uuid;
  v_primary_outgoing_id uuid;
  v_outgoing_ids uuid[];
  v_status text;
  v_scope text;
  v_open_installments numeric := 0;
  v_open_allocations numeric := 0;
  v_open_member_carryovers numeric := 0;
  v_open_unit_carryovers numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select t.workspace_id,
         t.condominium_id,
         t.unit_id,
         t.status,
         coalesce(t.data->>'transfer_scope', 'whole_property'),
         t.outgoing_member_id,
         case
           when jsonb_typeof(t.data->'outgoing_member_ids') = 'array'
             then coalesce(
             (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids')),
             array[t.outgoing_member_id]
           )
           else array[t.outgoing_member_id]
         end
    into v_workspace, v_condominium, v_unit, v_status, v_scope, v_primary_outgoing_id, v_outgoing_ids
  from public.condominium_member_transfers t
  where t.id = p_transfer_id;

  if v_workspace is null then
    raise exception 'TRANSFER_NOT_FOUND';
  end if;

  if v_primary_outgoing_id is null then
    raise exception 'TRANSFER_OUTGOING_MEMBER_REQUIRED';
  end if;
  if v_outgoing_ids is null then
    v_outgoing_ids := array[v_primary_outgoing_id];
  elsif not (v_primary_outgoing_id = any(v_outgoing_ids)) then
    v_outgoing_ids := array_prepend(v_primary_outgoing_id, v_outgoing_ids);
  end if;

  if not private.can_manage_workspace_module(v_workspace, 'condomini') then
    raise exception 'FORBIDDEN';
  end if;

  if v_status <> 'Confermato' then
    raise exception 'TRANSFER_NOT_OPEN';
  end if;

  if v_scope = 'ownership_share' then
    return jsonb_build_object(
      'transfer_id', p_transfer_id,
      'status', v_status,
      'transfer_scope', v_scope,
      'open_installments', 0,
      'open_allocations', 0,
      'open_member_carryovers', 0,
      'open_unit_carryovers', 0,
      'open_total', 0
    );
  end if;

  if exists (
    select 1
    from unnest(v_outgoing_ids) as outgoing(member_id)
    where outgoing.member_id is null
       or not exists (
         select 1
         from public.condominium_members m
         where m.id = outgoing.member_id
           and m.condominium_id = v_condominium
           and (m.unit_id is null or m.unit_id = v_unit)
       )
  ) then
    raise exception 'TRANSFER_OUTGOING_MEMBER_SCOPE_MISMATCH';
  end if;

  select coalesce(sum(i.amount - i.paid_amount), 0)
    into v_open_installments
  from public.condominium_installments i
  where i.workspace_id = v_workspace
    and i.condominium_id = v_condominium
    and (
      (i.member_id = any(v_outgoing_ids) and (i.unit_id is null or i.unit_id = v_unit))
      or (i.member_id is null and i.unit_id = v_unit)
    )
    and coalesce(i.amount - i.paid_amount, 0) > 0.005;

  select coalesce(sum(a.amount - a.paid_amount), 0)
    into v_open_allocations
  from public.condominium_expense_allocations a
  where a.workspace_id = v_workspace
    and a.condominium_id = v_condominium
    and (
      (a.member_id = any(v_outgoing_ids) and (a.unit_id is null or a.unit_id = v_unit))
      or (a.member_id is null and a.unit_id = v_unit)
    )
    and coalesce(a.amount - a.paid_amount, 0) > 0.005;

  select coalesce(sum(abs(c.balance)), 0)
    into v_open_member_carryovers
  from public.condominium_fiscal_carryovers c
  where c.workspace_id = v_workspace
    and c.condominium_id = v_condominium
    and c.member_id = any(v_outgoing_ids)
    and (c.unit_id is null or c.unit_id = v_unit)
    and abs(coalesce(c.balance, 0)) > 0.005;

  select coalesce(sum(abs(c.balance)), 0)
    into v_open_unit_carryovers
  from public.condominium_fiscal_carryovers c
  where c.workspace_id = v_workspace
    and c.condominium_id = v_condominium
    and c.unit_id = v_unit
    and c.member_id is null
    and abs(coalesce(c.balance, 0)) > 0.005;

  return jsonb_build_object(
    'transfer_id', p_transfer_id,
    'status', v_status,
    'transfer_scope', v_scope,
    'outgoing_member_ids', to_jsonb(v_outgoing_ids),
    'open_installments', round(v_open_installments, 2),
    'open_allocations', round(v_open_allocations, 2),
    'open_member_carryovers', round(v_open_member_carryovers, 2),
    'open_unit_carryovers', round(v_open_unit_carryovers, 2),
    'open_total', round(
      v_open_installments + v_open_allocations +
      v_open_member_carryovers + v_open_unit_carryovers,
      2
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_condominium uuid; v_unit uuid; v_primary_outgoing_id uuid; v_outgoing_ids uuid[]; v_transfer_status text; v_scope text;
  v_open_installments numeric; v_open_allocations numeric; v_open_carryovers numeric; v_open_unit_carryovers numeric; v_outgoing_id uuid; v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.workspace_id,t.condominium_id,t.unit_id,t.status,coalesce(t.data->>'transfer_scope','whole_property'),t.outgoing_member_id,
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then coalesce(
             (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids')),
             array[t.outgoing_member_id]
           )
              else array[t.outgoing_member_id] end
    into v_workspace,v_condominium,v_unit,v_transfer_status,v_scope,v_primary_outgoing_id,v_outgoing_ids
  from public.condominium_member_transfers t where t.id=p_transfer_id for update;
  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_primary_outgoing_id is null then raise exception 'TRANSFER_OUTGOING_MEMBER_REQUIRED'; end if;
  if v_outgoing_ids is null then v_outgoing_ids:=array[v_primary_outgoing_id];
  elsif not (v_primary_outgoing_id=any(v_outgoing_ids)) then v_outgoing_ids:=array_prepend(v_primary_outgoing_id,v_outgoing_ids); end if;
  if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
  if v_scope='ownership_share' then raise exception 'TRANSFER_QUOTA_NOT_CLOSABLE'; end if;

  -- Lock only rows already belonging to this transfer's condominium/unit.
  -- This prevents their scope changing between validation and archival without
  -- taking locks on unrelated tenants' member rows.
  perform 1
  from public.condominium_members m
  where m.id = any(v_outgoing_ids)
    and m.condominium_id = v_condominium
    and (m.unit_id is null or m.unit_id = v_unit)
  for update;

  if exists (
    select 1
    from unnest(v_outgoing_ids) as outgoing(member_id)
    where outgoing.member_id is null
       or not exists (
         select 1
         from public.condominium_members m
         where m.id = outgoing.member_id
           and m.condominium_id = v_condominium
           and (m.unit_id is null or m.unit_id = v_unit)
       )
  ) then
    raise exception 'TRANSFER_OUTGOING_MEMBER_SCOPE_MISMATCH';
  end if;

  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and ((i.member_id=any(v_outgoing_ids) and (i.unit_id is null or i.unit_id=v_unit)) or (i.member_id is null and i.unit_id=v_unit)) and i.amount-i.paid_amount>0.005;
  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations
    from public.condominium_expense_allocations a
    where a.workspace_id=v_workspace and a.condominium_id=v_condominium
      and ((a.member_id=any(v_outgoing_ids) and (a.unit_id is null or a.unit_id=v_unit))
        or (a.member_id is null and a.unit_id=v_unit))
      and coalesce(a.amount-a.paid_amount,0)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.workspace_id=v_workspace and c.condominium_id=v_condominium and c.member_id=any(v_outgoing_ids) and (c.unit_id is null or c.unit_id=v_unit) and abs(c.balance)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c
    where c.workspace_id=v_workspace and c.condominium_id=v_condominium and c.unit_id=v_unit and c.member_id is null and abs(c.balance)>0.005;
  if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then
    raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: i cedenti mantengono la posizione attiva finché tutte le situazioni contabili non sono chiuse';
  end if;
  foreach v_outgoing_id in array v_outgoing_ids loop
    select coalesce(m.data,'{}'::jsonb) into v_out_data
    from public.condominium_members m
    where m.id = v_outgoing_id
      and m.condominium_id = v_condominium
      and (m.unit_id is null or m.unit_id = v_unit)
    for update;
    if not found then
      raise exception 'TRANSFER_OUTGOING_MEMBER_SCOPE_MISMATCH';
    end if;
    update public.condominium_members
    set active=false,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','Archiviato','current_owner',false)
    where id=v_outgoing_id
      and condominium_id=v_condominium
      and (unit_id is null or unit_id=v_unit);
  end loop;
  update public.condominium_member_transfers set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),data=coalesce(data,'{}'::jsonb)||jsonb_build_object('financial_positions_closed',true) where id=p_transfer_id;
  return true;
end;
$function$

