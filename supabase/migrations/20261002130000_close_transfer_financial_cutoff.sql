-- Close only the outgoing member's financial positions attributable by due date
-- to the transfer date. Undated installments/allocations and fiscal carryovers remain
-- conservative blockers because the schema lacks a reliable effective date for them.
create or replace function private.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_workspace uuid;
  v_outgoing uuid;
  v_transfer_date date;
  v_transfer_status text;
  v_open_installments numeric;
  v_open_allocations numeric;
  v_open_carryovers numeric;
  v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select t.workspace_id,t.outgoing_member_id,t.transfer_date,t.status
    into v_workspace,v_outgoing,v_transfer_date,v_transfer_status
  from public.condominium_member_transfers t
  where t.id=p_transfer_id
  for update;

  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then
    raise exception 'FORBIDDEN';
  end if;
  if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;

  select coalesce(sum(i.amount-i.paid_amount),0)
    into v_open_installments
  from public.condominium_installments i
  where i.member_id=v_outgoing
    and (i.due_date is null or i.due_date<=v_transfer_date)
    and i.amount-i.paid_amount>0.005;

  select coalesce(sum(a.amount-a.paid_amount),0)
    into v_open_allocations
  from public.condominium_expense_allocations a
  where a.member_id=v_outgoing
    and (a.due_date is null or a.due_date<=v_transfer_date)
    and a.amount-a.paid_amount>0.005;

  -- Carryovers have no effective/due date in the current schema, so all
  -- outstanding carryovers remain subject to reconciliation before closure.
  select coalesce(sum(abs(c.balance)),0)
    into v_open_carryovers
  from public.condominium_fiscal_carryovers c
  where c.member_id=v_outgoing and abs(c.balance)>0.005;

  if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 then
    raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: restano partite contabili da riconciliare riferibili al cedente';
  end if;

  select coalesce(m.data,'{}'::jsonb) into v_out_data
  from public.condominium_members m where m.id=v_outgoing for update;

  if not found then raise exception 'OUTGOING_MEMBER_NOT_FOUND'; end if;

  update public.condominium_members
  set active=false,updated_at=now(),
      data=v_out_data||jsonb_build_object('position_status','Archiviato')
  where id=v_outgoing;

  update public.condominium_member_transfers
  set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),
      data=coalesce(data,'{}'::jsonb)||jsonb_build_object(
        'financial_positions_closed',true,
        'closure_cutoff_date',v_transfer_date,
        'undated_allocations_and_fiscal_carryovers_reconciled',true
      )
  where id=p_transfer_id;

  return true;
end;
$function$;
