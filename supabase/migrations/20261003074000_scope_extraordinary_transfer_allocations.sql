-- Forward repair for environments where the earlier extraordinary-allocation
-- snapshot migration is already recorded: scope both allocation and ledger rows.
do $migration$
declare
  v_def text;
  v_old text := $old$where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date is not null and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)$old$;
  v_new text := $new$where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.member_id=p_outgoing_member_id and l.workspace_id=v_workspace and l.condominium_id=v_condominium and l.expense_type='Straordinaria' and l.deliberation_date is not null and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)$new$;
begin
  v_def := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position('''extraordinary_deliberated_before_due_after''' in v_def)>0 then
    -- 0500 installs an already-scoped multiline query; validate predicates, not whitespace.
    if (length(v_def)-length(replace(v_def,'''extraordinary_deliberated_before_due_after''','')))/length('''extraordinary_deliberated_before_due_after''')<>1
       or (length(v_def)-length(replace(v_def,'from public.condominium_expense_allocations a','')))/length('from public.condominium_expense_allocations a')<>1
       or (length(v_def)-length(replace(v_def,'join public.condominium_ledger_entries l on l.id=a.ledger_entry_id','')))/length('join public.condominium_ledger_entries l on l.id=a.ledger_entry_id')<>1
       or (length(v_def)-length(replace(v_def,'a.workspace_id=v_workspace','')))/length('a.workspace_id=v_workspace')<>1
       or (length(v_def)-length(replace(v_def,'a.condominium_id=v_condominium','')))/length('a.condominium_id=v_condominium')<>1
       or (length(v_def)-length(replace(v_def,'l.workspace_id=v_workspace','')))/length('l.workspace_id=v_workspace')<>1
       or (length(v_def)-length(replace(v_def,'l.condominium_id=v_condominium','')))/length('l.condominium_id=v_condominium')<>1
       or position('and l.expense_type=''Straordinaria''' in v_def)=0
       or position('and l.deliberation_date<=p_transfer_date' in v_def)=0
       or position('and (a.due_date is null or a.due_date>p_transfer_date)' in v_def)=0
       or position(v_old in v_def)>0 then
      raise exception 'Extraordinary allocation query is duplicated, incomplete, or insufficiently scoped';
    end if;
    return;
  end if;
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique unscoped extraordinary allocation query; migration stopped';
  end if;
  execute replace(v_def,v_old,v_new);
end
$migration$;
