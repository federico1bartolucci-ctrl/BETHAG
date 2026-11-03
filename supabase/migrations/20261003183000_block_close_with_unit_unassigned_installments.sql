-- Add transfer unit context and validate the unit-level unpaid installment guard.
-- The guard itself is installed by 20261003065000; avoid adding it twice.
do $migration$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);

  if position('v_condominium uuid' in v_def)=0 or position('v_unit uuid' in v_def)=0 then
    v_old := 'v_open_unit_carryovers numeric; v_open_unit_installments numeric; v_out_data jsonb;';
    v_new := 'v_open_unit_carryovers numeric; v_open_unit_installments numeric; v_condominium uuid; v_unit uuid; v_out_data jsonb;';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Transfer-close context declaration anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;

  if position('select t.workspace_id,t.condominium_id,t.unit_id,t.outgoing_member_id,t.status into v_workspace,v_condominium,v_unit,v_outgoing,v_transfer_status' in v_def)=0 then
    v_old := 'select t.workspace_id,t.outgoing_member_id,t.status into v_workspace,v_outgoing,v_transfer_status';
    v_new := 'select t.workspace_id,t.condominium_id,t.unit_id,t.outgoing_member_id,t.status into v_workspace,v_condominium,v_unit,v_outgoing,v_transfer_status';
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Transfer-close context query anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;

  if position('v_condominium uuid' in v_def)=0
     or position('v_unit uuid' in v_def)=0
     or position('into v_open_unit_installments' in v_def)=0
     or position('or v_open_unit_installments>0.005' in v_def)=0
     or position('i.member_id is null and i.amount-i.paid_amount>0.005' in v_def)=0
     or position('select t.workspace_id,t.condominium_id,t.unit_id,t.outgoing_member_id,t.status into v_workspace,v_condominium,v_unit,v_outgoing,v_transfer_status' in v_def)=0
     or position('i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.unit_id=t.unit_id' in v_def)=0 then
    raise exception 'Unit-level unpaid installment close guard or context missing';
  end if;
  execute v_def;
end
$migration$;
