-- Preserve the unit's pre-transfer ledger detail in the immutable confirmation snapshot.
-- A later lifecycle rewrite had omitted unit_expenses from v_snapshot.
do $migration$
declare
  v_definition text;
  v_old text := $old$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),$old$;
  v_new text := $new$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),
    'unit_expenses',coalesce((select jsonb_agg(jsonb_build_object(
      'id',l.id,
      'description',l.description,
      'expense_type',l.expense_type,
      'entry_date',l.entry_date,
      'deliberation_date',l.deliberation_date,
      'amount',l.amount,
      'assembly_id',l.assembly_id,
      'deliberation_before_transfer',case when l.deliberation_date is not null and l.deliberation_date<=p_transfer_date then true else false end
    ) order by coalesce(l.deliberation_date,l.entry_date),l.id)
    from public.condominium_ledger_entries l
    where l.unit_id=p_unit_id
      and l.condominium_id=v_condominium
      and l.workspace_id=v_workspace
      and l.direction='Uscita'
      and (l.entry_date<=p_transfer_date or (l.deliberation_date is not null and l.deliberation_date<=p_transfer_date))
    ),'[]'::jsonb),$new$;
begin
  v_definition := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position('''unit_expenses''' in v_definition)>0 then
    if (length(v_definition)-length(replace(v_definition,'''unit_expenses''','')))<>length('''unit_expenses''')
       or position('from public.condominium_ledger_entries l' in v_definition)=0
       or position('l.unit_id=p_unit_id' in v_definition)=0
       or position('l.condominium_id=v_condominium' in v_definition)=0
       or position('l.workspace_id=v_workspace' in v_definition)=0
       or position('l.direction=''Uscita''' in v_definition)=0
       or position('(l.entry_date<=p_transfer_date or (l.deliberation_date is not null and l.deliberation_date<=p_transfer_date))' in v_definition)=0 then
      raise exception 'Unit expense snapshot is incomplete, duplicated, or missing source/scope/date filters';
    end if;
    raise notice 'Unit expense detail already captured in transfer snapshot';
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique accounting snapshot insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;
