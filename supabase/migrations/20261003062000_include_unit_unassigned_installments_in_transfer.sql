-- Include unit-level installments that have no member_id in transfer accounting.
-- Keep them identifiable as unit_unassigned so they are not mistaken for personal debts.
do $$
declare v_def text; v_old text; v_new text;
begin
  v_def := pg_get_functiondef('public.preview_condominium_member_transfer(uuid,uuid,date)'::regprocedure);
  v_old := 'where i.member_id=p_outgoing_member_id';
  v_new := 'where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id))';
  if position(v_old in v_def)=0 then
    if position(v_new in v_def)>0 and position('''assignment_scope''' in v_def)>0 then
      null;
    else
      raise exception 'Preview installment query anchor missing or unit-unassigned scope incomplete';
    end if;
  else
    v_def := replace(v_def,v_old,v_new);
  end if;
  v_def := replace(v_def, '''id'',i.id,''title'',i.title', '''id'',i.id,''assignment_scope'',case when i.member_id is null then ''unit_unassigned'' else ''member'' end,''title'',i.title');
  execute v_def;

  v_def := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position(v_old in v_def)=0 then
    if position(v_new in v_def)>0 and position('''assignment_scope''' in v_def)>0 then
      null;
    else
      raise exception 'Confirmation installment query anchor missing or unit-unassigned scope incomplete';
    end if;
  else
    v_def := replace(v_def,v_old,v_new);
  end if;
  v_def := replace(v_def, '''id'',i.id,''title'',i.title', '''id'',i.id,''assignment_scope'',case when i.member_id is null then ''unit_unassigned'' else ''member'' end,''title'',i.title');
  execute v_def;
end $$;
