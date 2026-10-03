-- Prevent transfer closure while unit-level, unassigned installments remain open.
-- Scope the check to the transfer workspace, condominium and unit.
do $$
declare
  v_def text;
  v_installment_query text := 'select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005;';
  v_unit_query text := 'select coalesce(sum(i.amount-i.paid_amount),0) into v_open_unit_installments from public.condominium_installments i join public.condominium_member_transfers t on t.id=p_transfer_id where i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.unit_id=t.unit_id and i.member_id is null and i.amount-i.paid_amount>0.005;';
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);

  if position('v_open_unit_installments numeric' in v_def) > 0
     and position('into v_open_unit_installments' in v_def) > 0
     and position('or v_open_unit_installments>0.005' in v_def) > 0 then
    return;
  end if;

  if position('v_open_unit_carryovers numeric; v_out_data jsonb;' in v_def) = 0 then
    raise exception 'Expected transfer-close declaration not found; refusing partial patch';
  end if;
  v_def := replace(
    v_def,
    'v_open_unit_carryovers numeric; v_out_data jsonb;',
    'v_open_unit_carryovers numeric; v_open_unit_installments numeric; v_out_data jsonb;'
  );

  if position(v_installment_query in v_def) = 0 then
    raise exception 'Expected assigned-installment query not found; refusing partial patch';
  end if;
  v_def := replace(v_def, v_installment_query, v_installment_query || chr(10) || v_unit_query);

  if position('if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then' in v_def) = 0 then
    raise exception 'Expected transfer-close financial guard not found; refusing partial patch';
  end if;
  v_def := replace(
    v_def,
    'if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then',
    'if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_installments>0.005 or v_open_unit_carryovers>0.005 then'
  );

  if position('into v_open_unit_installments' in v_def) = 0
     or position('or v_open_unit_installments>0.005' in v_def) = 0 then
    raise exception 'Unit installment close guard verification failed';
  end if;
  execute v_def;
end $$;
