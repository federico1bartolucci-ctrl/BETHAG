-- Enforce tenant and expense-direction scope in transfer preview and snapshot reader.
-- Idempotent function-definition repair; does not modify ledger rows.
do $migration$
declare
  v_sig text;
  v_def text;
  v_old text;
  v_new text;
begin
  foreach v_sig in array array[
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'public.get_member_transfer_accounting_snapshot(uuid)'
  ] loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if v_sig like 'public.preview_%' then
      v_old := 'where l.unit_id=p_unit_id and l.condominium_id=v_condominium and (';
      v_new := 'where l.unit_id=p_unit_id and l.condominium_id=v_condominium and l.workspace_id=v_workspace and l.direction=''Uscita'' and (';
    else
      v_old := 'where l.unit_id=t.unit_id and l.condominium_id=t.condominium_id and (';
      v_new := 'where l.unit_id=t.unit_id and l.condominium_id=t.condominium_id and l.workspace_id=t.workspace_id and l.direction=''Uscita'' and (';
    end if;
    if position(v_new in v_def)>0 then
      continue;
    end if;
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Expected unique unit expense query anchor missing or duplicated for %',v_sig;
    end if;
    v_def := replace(v_def,v_old,v_new);
    if position(v_new in v_def)=0 then
      raise exception 'Could not enforce workspace and expense direction for %',v_sig;
    end if;
    execute v_def;
  end loop;
end
$migration$;
