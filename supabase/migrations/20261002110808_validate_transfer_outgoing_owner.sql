-- Require the outgoing record to represent the current owner before confirming a transfer.
-- The confirmation RPC runs in a privileged context, so validate the business role explicitly.
do $migration$
declare
  v_definition text;
  v_old text := $old$and m.unit_id=p_unit_id and m.active
  ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;$old$;
  v_new text := $new$and m.unit_id=p_unit_id
      and m.active
      and trim(coalesce(m.data->>'role',''))='Proprietario'
      and coalesce(m.data->>'current_owner','true')='true'
      and coalesce(m.data->>'position_status','Attivo') <> 'In chiusura'
  ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT'; end if;$new$;
begin
  v_definition := pg_get_functiondef('private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure);
  if position(v_old in v_definition)=0 then
    if position('OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT' in v_definition)>0 then
      return;
    end if;
    raise exception 'Expected outgoing-member validation fragment not found';
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected validation fragment is not unique';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;
