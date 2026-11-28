create or replace function private.check_condominium_member_transfer_closure(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_workspace uuid;
  v_outgoing uuid;
  v_status text;
  v_open_installments numeric := 0;
  v_open_allocations numeric := 0;
  v_open_member_carryovers numeric := 0;
  v_open_unit_carryovers numeric := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select t.workspace_id, t.outgoing_member_id, t.status
    into v_workspace, v_outgoing, v_status
  from public.condominium_member_transfers t
  where t.id = p_transfer_id;

  if v_workspace is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
  if not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_status <> 'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;

  select coalesce(sum(i.amount-i.paid_amount),0)
    into v_open_installments
  from public.condominium_installments i
  where i.member_id=v_outgoing and coalesce(i.amount-i.paid_amount,0)>0.005;

  select coalesce(sum(a.amount-a.paid_amount),0)
    into v_open_allocations
  from public.condominium_expense_allocations a
  where a.member_id=v_outgoing and coalesce(a.amount-a.paid_amount,0)>0.005;

  select coalesce(sum(abs(c.balance)),0)
    into v_open_member_carryovers
  from public.condominium_fiscal_carryovers c
  where c.member_id=v_outgoing and abs(coalesce(c.balance,0))>0.005;

  select coalesce(sum(abs(c.balance)),0)
    into v_open_unit_carryovers
  from public.condominium_fiscal_carryovers c
  join public.condominium_member_transfers t on t.id=p_transfer_id
  where c.workspace_id=t.workspace_id
    and c.condominium_id=t.condominium_id
    and c.unit_id=t.unit_id
    and c.member_id is null
    and abs(coalesce(c.balance,0))>0.005;

  return jsonb_build_object(
    'transfer_id',p_transfer_id,
    'status',v_status,
    'outgoing_member_id',v_outgoing,
    'open_installments',round(v_open_installments,2),
    'open_allocations',round(v_open_allocations,2),
    'open_member_carryovers',round(v_open_member_carryovers,2),
    'open_unit_carryovers',round(v_open_unit_carryovers,2),
    'open_total',round(v_open_installments+v_open_allocations+v_open_member_carryovers+v_open_unit_carryovers,2)
  );
end;
$function$;

create or replace function public.check_condominium_member_transfer_closure(p_transfer_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
begin
  return private.check_condominium_member_transfer_closure(p_transfer_id);
end;
$function$;