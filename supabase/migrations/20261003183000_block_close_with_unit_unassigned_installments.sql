-- Prevent closing a member transfer while unit-level unassigned installments remain open.
-- Preserve the existing private RPC body, security attributes, authorization and accounting guards.
do $migration$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);

  if position('v_open_unit_installments' in v_def)>0 then
    if position('i.member_id is null and i.unit_id=v_unit' in v_def)>0 then
      return;
    end if;
    raise exception 'Partial unit-installment close guard detected; refusing to patch';
  end if;

  v_old := 'v_open_unit_carryovers numeric;';
  v_new := 'v_open_unit_carryovers numeric; v_condominium uuid; v_unit uuid; v_open_unit_installments numeric;';
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Close guard declaration anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'select t.workspace_id,t.outgoing_member_id,t.status into v_workspace,v_outgoing,v_transfer_status';
  v_new := 'select t.workspace_id,t.condominium_id,t.unit_id,t.outgoing_member_id,t.status into v_workspace,v_condominium,v_unit,v_outgoing,v_transfer_status';
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Transfer context anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005 and exists (select 1 from public.condominium_member_transfers t where t.id=p_transfer_id and t.workspace_id=i.workspace_id and t.condominium_id=i.condominium_id);';
  v_new := v_old || E'\n select coalesce(sum(i.amount-i.paid_amount),0) into v_open_unit_installments from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and i.unit_id=v_unit and i.member_id is null and i.amount-i.paid_amount>0.005;';
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Assigned installment guard anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then';
  v_new := 'if v_open_installments>0.005 or v_open_unit_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then';
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Financial close condition anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  if position('i.member_id is null and i.unit_id=v_unit' in v_def)=0
     or position('v_open_unit_installments>0.005' in v_def)=0 then
    raise exception 'Unit-level installment close guard verification failed';
  end if;
  execute v_def;
end
$migration$;
