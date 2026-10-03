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
  v_key text := '''extraordinary_deliberated_before_due_after''';
  v_source text := 'from public.condominium_expense_allocations a' || chr(10) || '      join public.condominium_ledger_entries l on l.id=a.ledger_entry_id';
  v_scope_a text := 'where a.workspace_id=v_workspace' || chr(10) || '        and a.condominium_id=v_condominium';
  v_scope_l text := 'and l.workspace_id=v_workspace' || chr(10) || '        and l.condominium_id=v_condominium';
begin
  v_definition := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position(v_key in v_definition)>0 then
    if (length(v_definition)-length(replace(v_definition,v_key,'')))/length(v_key)<>1
       or (length(v_definition)-length(replace(v_definition,v_source,'')))/length(v_source)<>1
       or (length(v_definition)-length(replace(v_definition,v_scope_a,'')))/length(v_scope_a)<>1
       or (length(v_definition)-length(replace(v_definition,v_scope_l,'')))/length(v_scope_l)<>1
       or position('and l.expense_type=''Straordinaria''' in v_definition)=0
       or position('and l.deliberation_date<=p_transfer_date' in v_definition)=0
       or position('and (a.due_date is null or a.due_date>p_transfer_date)' in v_definition)=0 then
      raise exception 'Extraordinary allocation snapshot is duplicated or lacks required source, tenant, condominium, or date/type filters';
    end if;
    raise notice 'Extraordinary allocation snapshot already exists with expected scope';
    return;
  end if;
  if (length(v_definition)-length(replace(v_definition,v_old,'')))/length(v_old)<>1 then
    raise exception 'Expected unique accounting snapshot insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;
