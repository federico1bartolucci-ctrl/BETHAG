-- Scope outgoing-member allocation totals in the immutable transfer snapshot.
-- Preserve the outgoing-member filter and exclude allocations from other condominiums/workspaces.
do $migration$
declare
  v_definition text;
  v_old text := $old$from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)$old$;
  v_new text := $new$from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and a.workspace_id=v_workspace and a.condominium_id=v_condominium and (a.due_date is null or a.due_date<=p_transfer_date)$new$;
begin
  v_definition := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position(v_new in v_definition)>0 then return; end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique allocation-total anchor missing; refusing partial patch';
  end if;
  v_definition := replace(v_definition,v_old,v_new);
  if position(v_new in v_definition)=0 then raise exception 'Allocation-total scope verification failed'; end if;
  execute v_definition;
end
$migration$;
