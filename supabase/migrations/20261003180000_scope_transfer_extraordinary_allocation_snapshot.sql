-- Scope extraordinary-allocation snapshot rows to the transfer's workspace and condominium.
-- Keep the outgoing member predicate: this does not transfer another owner's liabilities.
do $migration$
declare
  v_definition text;
  v_old text := $old$where a.member_id=p_outgoing_member_id
        and l.expense_type='Straordinaria'$old$;
  v_new text := $new$where a.member_id=p_outgoing_member_id
        and a.workspace_id=v_workspace
        and a.condominium_id=v_condominium
        and l.workspace_id=v_workspace
        and l.condominium_id=v_condominium
        and l.expense_type='Straordinaria'$new$;
begin
  v_definition := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position(v_new in v_definition)>0 then
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique extraordinary-allocation snapshot anchor missing; refusing partial patch';
  end if;
  v_definition := replace(v_definition,v_old,v_new);
  if position(v_new in v_definition)=0 then
    raise exception 'Extraordinary-allocation scope verification failed';
  end if;
  execute v_definition;
end
$migration$;
