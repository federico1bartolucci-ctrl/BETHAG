-- Scope extraordinary allocation preview rows to the resolved workspace and condominium.
do $migration$
declare
  v_def text;
  v_old text := $old$where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)$old$;
  v_new text := $new$where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.member_id=p_outgoing_member_id and l.workspace_id=v_workspace and l.condominium_id=v_condominium and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)$new$;
begin
  v_def := pg_get_functiondef('public.preview_condominium_member_transfer(uuid,uuid,date)'::regprocedure);
  if position(v_new in v_def)>0 then
    if position(v_old in v_def)>0 then
      raise exception 'Preview contains both scoped and unscoped extraordinary allocation predicates';
    end if;
    return;
  end if;
  if (length(v_def)-length(replace(v_def,v_old,''))) / length(v_old) <> 2 then
    raise exception 'Expected two extraordinary allocation preview anchors; migration stopped';
  end if;
  v_def := replace(v_def,v_old,v_new);
  if position(v_new in v_def)=0 or position(v_old in v_def)>0 then
    raise exception 'Could not scope extraordinary allocation preview';
  end if;
  execute v_def;
end
$migration$;
