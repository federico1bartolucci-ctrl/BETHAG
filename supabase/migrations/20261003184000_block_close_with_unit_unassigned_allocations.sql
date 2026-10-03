-- Prevent transfer closure while unit-level allocations not assigned to a member remain open.
-- Keep member-linked allocations in the separate personal-balance guard.
do $migration$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);

  if position('v_open_unit_allocations' in v_def)>0 then
    if position('a.member_id is null and a.unit_id=v_unit' in v_def)>0 then return; end if;
    raise exception 'Partial unit-allocation close guard detected; refusing to patch';
  end if;

  v_old := 'v_open_unit_installments numeric;';
  v_new := 'v_open_unit_installments numeric; v_open_unit_allocations numeric;';
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Unit allocation declaration anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'if v_open_installments>0.005 or v_open_unit_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then';
  v_new := 'select coalesce(sum(a.amount-a.paid_amount),0) into v_open_unit_allocations from public.condominium_expense_allocations a where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.unit_id=v_unit and a.member_id is null and a.amount-a.paid_amount>0.005;' || chr(10) || v_old;
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Financial close condition anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  v_old := 'if v_open_installments>0.005 or v_open_unit_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then';
  v_new := 'if v_open_installments>0.005 or v_open_unit_installments>0.005 or v_open_allocations>0.005 or v_open_unit_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then';
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Updated financial close condition anchor missing or ambiguous';
  end if;
  v_def := replace(v_def,v_old,v_new);

  if position('a.member_id is null and a.unit_id=v_unit' in v_def)=0
     or position('v_open_unit_allocations>0.005' in v_def)=0 then
    raise exception 'Unit-level allocation close guard verification failed';
  end if;
  execute v_def;
end
$migration$;
