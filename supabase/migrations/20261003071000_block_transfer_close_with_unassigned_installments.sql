-- Do not archive the outgoing owner while unit-level installments remain unassigned.
-- These installments are surfaced in the immutable transfer snapshot, but unlike
-- member-specific installments they are not covered by the outgoing-member balance check.
do $migration$
declare
  v_def text;
  v_anchor text := 'select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c join public.condominium_member_transfers t on t.id=p_transfer_id where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(c.balance)>0.005;';
  v_query text := 'select coalesce(sum(i.amount-i.paid_amount),0) into v_open_unit_installments from public.condominium_installments i join public.condominium_member_transfers t on t.id=p_transfer_id where i.workspace_id=t.workspace_id and i.condominium_id=t.condominium_id and i.unit_id=t.unit_id and i.member_id is null and i.amount-i.paid_amount>0.005;';
  v_decl text := 'v_open_unit_carryovers numeric; v_out_data jsonb;';
  v_condition text := 'or v_open_unit_carryovers>0.005 then';
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);
  if position('v_open_unit_installments' in v_def)>0 then
    if (length(v_def)-length(replace(v_def,'v_open_unit_installments numeric;','')))<>length('v_open_unit_installments numeric;')
       or (length(v_def)-length(replace(v_def,v_query,'')))<>length(v_query)
       or (length(v_def)-length(replace(v_def,'or v_open_unit_installments>0.005','')))<>length('or v_open_unit_installments>0.005')
       or (length(v_def)-length(replace(v_def,v_anchor,'')))<>length(v_anchor)
       or position(v_condition in v_def)=0
       or (length(v_def)-length(replace(v_def,v_condition,'')))<>length(v_condition) then
      raise exception 'Unit-level installment guard is incomplete, duplicated, or mixed';
    end if;
    return;
  end if;
  if length(v_def)-length(replace(v_def,v_anchor,''))<>length(v_anchor) then
    raise exception 'Expected unique unit-carryover query anchor not found; close guard was not changed';
  end if;
  if length(v_def)-length(replace(v_def,v_decl,''))<>length(v_decl) then
    raise exception 'Expected unique close-function declaration anchor not found';
  end if;
  if length(v_def)-length(replace(v_def,v_condition,''))<>length(v_condition) then
    raise exception 'Expected unique close-function condition anchor not found';
  end if;
  v_def := replace(v_def,v_decl,'v_open_unit_carryovers numeric; v_open_unit_installments numeric; v_out_data jsonb;');
  v_def := replace(v_def,v_anchor,v_anchor||chr(10)||' '||v_query);
  v_def := replace(v_def,v_condition,'or v_open_unit_carryovers>0.005 or v_open_unit_installments>0.005 then');
  if position('v_open_unit_installments numeric' in v_def)=0
     or position('into v_open_unit_installments' in v_def)=0
     or position('or v_open_unit_installments>0.005 then' in v_def)=0 then
    raise exception 'Could not install complete unit-level installment close guard';
  end if;
  execute v_def;
end
$migration$;
