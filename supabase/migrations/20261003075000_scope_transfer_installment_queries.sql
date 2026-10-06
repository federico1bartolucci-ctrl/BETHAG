-- Scope every transfer preview/confirmation installment read to the unit's tenant.
-- Prevent same-unit/member identifiers from exposing or aggregating rows across workspaces.
do $migration$
declare
  v_sig text;
  v_def text;
  v_count integer;
  v_old text := 'where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id))';
  v_new text := 'where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id))';
begin
  foreach v_sig in array array[
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'
  ] loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if position(v_new in v_def)>0 then
      v_count := (length(v_def)-length(replace(v_def,v_new,'')))/length(v_new);
      if position(v_old in v_def)>0
         or (v_sig='public.preview_condominium_member_transfer(uuid,uuid,date)' and v_count<>7)
         or (v_sig like 'private.confirm_%' and v_count<>6) then
        raise exception 'Scoped installment predicates are duplicated, incomplete, or mixed in % (count=%)',v_sig,v_count;
      end if;
      continue;
    end if;
    v_count := (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old);
    if v_count=0 then
      raise exception 'Expected installment predicate missing in %',v_sig;
    end if;
    if v_sig='public.preview_condominium_member_transfer(uuid,uuid,date)' and v_count<>7 then
      raise exception 'Unexpected installment predicate count % in %',v_count,v_sig;
    elsif v_sig like 'private.confirm_%' and v_count<>6 then
      raise exception 'Unexpected installment predicate count % in %',v_count,v_sig;
    end if;
    v_def := replace(v_def,v_old,v_new);
    if position(v_new in v_def)=0 or position(v_old in v_def)>0 then
      raise exception 'Could not fully scope installment reads in %',v_sig;
    end if;
    execute v_def;
  end loop;
end
$migration$;
