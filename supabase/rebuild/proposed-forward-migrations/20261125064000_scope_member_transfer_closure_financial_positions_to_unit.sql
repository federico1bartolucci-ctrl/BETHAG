-- Keep transfer-closure financial checks aligned with the selected unit.
-- Existing scope triggers validate workspace/condominium ownership but permit
-- a member-linked child row to reference a different unit in the same condominium.
-- Legacy member-linked rows without unit_id remain included for compatibility.
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
         case
           when jsonb_typeof(t.data->'outgoing_member_ids') = 'array'
             then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
           else array[t.outgoing_member_id]
         end
    into v_workspace, v_condominium, v_unit, v_status, v_scope, v_outgoing_ids
  from public.condominium_member_transfers t
  where t.id = p_transfer_id;

  if v_workspace is null then
    raise exception 'TRANSFER_NOT_FOUND';
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

  select coalesce(sum(i.amount - i.paid_amount), 0)
    into v_open_installments
  from public.condominium_installments i
  where i.workspace_id = v_workspace
    and i.condominium_id = v_condominium
    and i.member_id = any(v_outgoing_ids)
    and (i.unit_id is null or i.unit_id = v_unit)
    and coalesce(i.amount - i.paid_amount, 0) > 0.005;

  select coalesce(sum(a.amount - a.paid_amount), 0)
    into v_open_allocations
  from public.condominium_expense_allocations a
  where a.workspace_id = v_workspace
    and a.condominium_id = v_condominium
    and a.member_id = any(v_outgoing_ids)
    and (a.unit_id is null or a.unit_id = v_unit)
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
