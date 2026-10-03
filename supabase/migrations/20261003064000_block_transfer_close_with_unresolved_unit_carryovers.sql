-- Prevent transfer closure while unit-level fiscal carryovers remain unresolved.
-- Guard every source anchor before replacing the live function definition.
do $$
declare
 v_def text;
 v_decl text := 'v_open_carryovers numeric; v_out_data jsonb;';
 v_query text := 'select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=v_outgoing and abs(c.balance)>0.005;';
 v_condition text := 'if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 then';
 v_unit_decl text := 'v_open_unit_carryovers numeric;';
 v_unit_query text := 'into v_open_unit_carryovers';
 v_unit_condition text := 'or v_open_unit_carryovers>0.005';
begin
 v_def:=pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);
 if position(v_unit_decl in v_def)>0 or position(v_unit_query in v_def)>0 or position(v_unit_condition in v_def)>0 then
   if position(v_unit_decl in v_def)=0 or position(v_unit_query in v_def)=0 or position(v_unit_condition in v_def)=0
      or (length(v_def)-length(replace(v_def,v_unit_decl,'')))<>length(v_unit_decl)
      or (length(v_def)-length(replace(v_def,v_unit_query,'')))<>length(v_unit_query)
      or (length(v_def)-length(replace(v_def,v_unit_condition,'')))<>length(v_unit_condition) then
     raise exception 'Unit-level carryover guard is incomplete or duplicated';
   end if;
   return;
 end if;
 if (length(v_def)-length(replace(v_def,v_decl,'')))<>length(v_decl) then
   raise exception 'Expected unique close-function declaration anchor missing or duplicated';
 end if;
 if (length(v_def)-length(replace(v_def,v_query,'')))<>length(v_query) then
   raise exception 'Expected unique member carryover query anchor missing or duplicated';
 end if;
 if (length(v_def)-length(replace(v_def,v_condition,'')))<>length(v_condition) then
   raise exception 'Expected unique close-function condition anchor missing or duplicated';
 end if;
 v_def:=replace(v_def,v_decl,'v_open_carryovers numeric; v_open_unit_carryovers numeric; v_out_data jsonb;');
 v_def:=replace(v_def,v_query,v_query||chr(10)||' select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c join public.condominium_member_transfers t on t.id=p_transfer_id where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(c.balance)>0.005;');
 v_def:=replace(v_def,v_condition,'if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then');
 if position(v_unit_decl in v_def)=0 or position(v_unit_query in v_def)=0 or position(v_unit_condition in v_def)=0 then
   raise exception 'Could not install complete unit-level carryover close guard';
 end if;
 execute v_def;
end $$;