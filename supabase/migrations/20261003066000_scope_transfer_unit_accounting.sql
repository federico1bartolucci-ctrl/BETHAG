-- Scope transfer installment and unassigned carryover snapshots to the owning workspace/condominium.
-- Fail closed if upstream function text differs, rather than applying a partial rewrite.
do $$
declare
  v_sig text;
  v_def text;
  v_old text := 'where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id))';
  v_new text := 'where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.workspace_id=v_workspace and i.condominium_id=v_condominium';
  v_carry_old text := 'where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005';
  v_carry_new text := 'where c.workspace_id=v_workspace and c.condominium_id=v_condominium and c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005';
begin
  foreach v_sig in array array[
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'
  ] loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if position(v_old in v_def)=0 then
      if position(v_new in v_def)>0 then
        null;
      else
        raise exception 'Installment scope anchor missing for %', v_sig;
      end if;
    else
      v_def := replace(v_def,v_old,v_new);
    end if;

    if position(v_carry_old in v_def)>0 then
      v_def := replace(v_def,v_carry_old,v_carry_new);
    elsif position(v_carry_new in v_def)=0 and position('unit_unassigned_carryovers' in v_def)>0 then
      raise exception 'Carryover scope anchor missing for %', v_sig;
    end if;
    execute v_def;
  end loop;
end $$;
