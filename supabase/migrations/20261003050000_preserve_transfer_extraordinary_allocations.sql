-- Preserve extraordinary allocations decided before the deed but due afterwards
-- in the immutable accounting snapshot stored when a member transfer is confirmed.
do $migration$
declare
  v_definition text;
  v_old text := $old$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),$old$;
  v_new text := $new$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),
    'extraordinary_deliberated_before_due_after',coalesce((
      select jsonb_agg(jsonb_build_object(
        'allocation_id',a.id,
        'ledger_entry_id',a.ledger_entry_id,
        'amount',a.amount,
        'paid_amount',a.paid_amount,
        'residual',a.amount-a.paid_amount,
        'due_date',a.due_date,
        'deliberation_date',l.deliberation_date,
        'description',l.description
      ) order by l.deliberation_date,a.due_date,a.id)
      from public.condominium_expense_allocations a
      join public.condominium_ledger_entries l on l.id=a.ledger_entry_id
      where a.workspace_id=v_workspace
        and a.condominium_id=v_condominium
        and a.member_id=p_outgoing_member_id
        and l.workspace_id=v_workspace
        and l.condominium_id=v_condominium
        and l.expense_type='Straordinaria'
        and l.deliberation_date is not null
        and l.deliberation_date<=p_transfer_date
        and (a.due_date is null or a.due_date>p_transfer_date)
    ),'[]'::jsonb),$new$;
begin
  v_definition := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position('extraordinary_deliberated_before_due_after' in v_definition)>0 then
    -- A prior definition may contain this JSON key with missing tenant filters.
    -- Leave any repair to the dedicated forward migration 20261003074000.
    raise notice 'Extraordinary allocation snapshot key already exists; forward scope repair handles incomplete filters';
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique accounting snapshot insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;