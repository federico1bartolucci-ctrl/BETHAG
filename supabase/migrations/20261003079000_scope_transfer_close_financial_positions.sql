-- Scope transfer-close financial checks to the exact tenant, condominium, and unit.
-- Unified owner installments have unit_id NULL: block closing a transfer if the
-- installment's source allocations include the transferred unit for the same owner.
-- This is fail-closed because installment paid_amount has no per-unit breakdown.
do $migration$
declare
  v_def text;
  v_old text;
  v_new text;
  v_safe text := 'from public.condominium_installments i join public.condominium_member_transfers t on t.id=p_transfer_id where i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.amount-i.paid_amount>0.005 and ((i.unit_id=t.unit_id and i.member_id=v_outgoing) or (i.unit_id is null and i.ledger_entry_id is not null and exists (select 1 from public.condominium_expense_allocations ea left join public.condominium_members cm_group on cm_group.unit_id=ea.unit_id and cm_group.condominium_id=t.condominium_id and cm_group.workspace_id=t.workspace_id join public.condominium_members cm_out on cm_out.id=v_outgoing and cm_out.condominium_id=t.condominium_id where ea.workspace_id=t.workspace_id and ea.condominium_id=t.condominium_id and ea.ledger_entry_id=i.ledger_entry_id and ea.unit_id=t.unit_id and ((i.member_id is null and i.notes=''''Rata unificata per proprietario'''') or ((cm_group.user_id is not null and cm_out.user_id=cm_group.user_id) or (cm_group.user_id is null and cm_out.user_id is null and lower(trim(coalesce(cm_group.email,'''')))=lower(trim(coalesce(cm_out.email,'''')))))))));';
  v_safe_count integer;
  v_old_count integer;
  v_new_count integer;
  v_idx integer;
  v_old_anchors text[] := array[
    'from public.condominium_installments i where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005;',
    'from public.condominium_expense_allocations a where a.member_id=v_outgoing and a.amount-a.paid_amount>0.005;',
    'from public.condominium_fiscal_carryovers c where c.member_id=v_outgoing and abs(c.balance)>0.005;'
  ];
  v_new_anchors text[] := array[
    'from public.condominium_installments i join public.condominium_member_transfers t on t.id=p_transfer_id where i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.unit_id=t.unit_id and i.member_id=v_outgoing and i.amount-i.paid_amount>0.005;',
    'from public.condominium_expense_allocations a join public.condominium_member_transfers t on t.id=p_transfer_id where a.workspace_id=t.workspace_id and a.condominium_id=t.condominium_id and a.unit_id=t.unit_id and a.member_id=v_outgoing and a.amount-a.paid_amount>0.005;',
    'from public.condominium_fiscal_carryovers c join public.condominium_member_transfers t on t.id=p_transfer_id where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id=v_outgoing and abs(c.balance)>0.005;'
  ];
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);

  v_old := v_old_anchors[1];
  v_new := v_new_anchors[1];
  v_safe_count := (length(v_def)-length(replace(v_def,v_safe,''))) / length(v_safe);
  v_old_count := (length(v_def)-length(replace(v_def,v_old,''))) / length(v_old);
  v_new_count := (length(v_def)-length(replace(v_def,v_new,''))) / length(v_new);
  if v_safe_count=1 and v_old_count=0 and v_new_count=0 then
    null;
  elsif v_safe_count=0 and v_old_count=1 and v_new_count=0 then
    v_def := replace(v_def,v_old,v_safe);
  elsif v_safe_count=0 and v_old_count=0 and v_new_count=1 then
    v_def := replace(v_def,v_new,v_safe);
  else
    raise exception 'Transfer close installment scope is missing, duplicated, or mixed (old %, scoped %, unified-safe %)',v_old_count,v_new_count,v_safe_count;
  end if;

  for v_idx in 2..array_length(v_old_anchors,1) loop
    v_old := v_old_anchors[v_idx];
    v_new := v_new_anchors[v_idx];
    v_old_count := (length(v_def)-length(replace(v_def,v_old,''))) / length(v_old);
    v_new_count := (length(v_def)-length(replace(v_def,v_new,''))) / length(v_new);
    if v_old_count=1 and v_new_count=0 then
      v_def := replace(v_def,v_old,v_new);
    elsif v_old_count=0 and v_new_count=1 then
      null;
    else
      raise exception 'Transfer close financial scope anchor % is missing, duplicated, or mixed (old %, scoped %)',v_idx,v_old_count,v_new_count;
    end if;
  end loop;
  execute v_def;
end
$migration$;
