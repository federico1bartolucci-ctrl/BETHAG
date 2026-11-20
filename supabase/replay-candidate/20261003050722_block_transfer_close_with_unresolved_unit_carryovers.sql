do $$
declare
 v_def text;
begin
 v_def:=pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);
 if position('v_open_unit_carryovers' in v_def)>0 then return; end if;
 v_def:=replace(v_def,'v_open_carryovers numeric; v_out_data jsonb;','v_open_carryovers numeric; v_open_unit_carryovers numeric; v_out_data jsonb;');
 if position('v_open_unit_carryovers numeric' in v_def)=0 then raise exception 'Could not add unit carryover guard declaration'; end if;
 v_def:=replace(v_def,
 'select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=v_outgoing and abs(c.balance)>0.005;',
 'select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=v_outgoing and abs(c.balance)>0.005;'||chr(10)||' select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c join public.condominium_member_transfers t on t.id=p_transfer_id where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(c.balance)>0.005;');
 if position('into v_open_unit_carryovers' in v_def)=0 then raise exception 'Could not add unit carryover query'; end if;
 v_def:=replace(v_def,'if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 then','if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then');
 if position('or v_open_unit_carryovers>0.005' in v_def)=0 then raise exception 'Could not add unit carryover close guard'; end if;
 execute v_def;
end $$;