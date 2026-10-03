-- Include unit-level installments that have no member_id in transfer accounting.
-- Keep them identifiable as unit_unassigned so they are not mistaken for personal debts.
do $migration$
declare
  v_def text;
  v_old text := 'where i.member_id=p_outgoing_member_id';
  v_new text := 'where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id))';
  v_count integer;
  v_json_old text := '''id'',i.id,''title'',i.title';
  v_json_new text := '''id'',i.id,''assignment_scope'',case when i.member_id is null then ''unit_unassigned'' else ''member'' end,''title'',i.title';
  v_json_count integer;
  v_sig text;
begin
  foreach v_sig in array array[
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'
  ] loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if position(v_new in v_def)>0 then
      if position(v_old in v_def)>0 then
        raise exception 'Mixed expanded and member-only installment predicates remain in %',v_sig;
      end if;
    else
      v_count := (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old);
      if (v_sig like 'public.preview_%' and v_count<>7)
         or (v_sig like 'private.confirm_%' and v_count<>6) then
        raise exception 'Unexpected outgoing installment anchor count % in %',v_count,v_sig;
      end if;
      v_def := replace(v_def,v_old,v_new);
    end if;
    if position('''assignment_scope''' in v_def)=0 then
      v_json_count := (length(v_def)-length(replace(v_def,v_json_old,'')))/length(v_json_old);
      if v_json_count<>1 then
        raise exception 'Unexpected installment JSON anchor count % in %',v_json_count,v_sig;
      end if;
      v_def := replace(v_def,v_json_old,v_json_new);
    end if;
    if position(v_new in v_def)=0 or position('''assignment_scope''' in v_def)=0 or position(v_old in v_def)>0 then
      raise exception 'Unit-unassigned installment scope incomplete in %',v_sig;
    end if;
    execute v_def;
  end loop;
end
$migration$;
