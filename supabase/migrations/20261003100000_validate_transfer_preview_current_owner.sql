-- Keep transfer previews restricted to the same current-owner record accepted by confirmation.
-- This prevents a resident or former owner from previewing another member's financial position.
do $migration$
declare
  v_definition text;
  v_old text := $old$where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active)$old$;
  v_new text := $new$where m.id=p_outgoing_member_id
      and m.condominium_id=v_condominium
      and m.unit_id=p_unit_id
      and m.active
      and trim(coalesce(m.data->>'role',''))='Proprietario'
      and coalesce(m.data->>'current_owner','true')='true'
      and coalesce(m.data->>'position_status','Attivo') <> 'In chiusura')$new$;
begin
  v_definition := pg_get_functiondef('public.preview_condominium_member_transfer(uuid,uuid,date)'::regprocedure);

  if position(v_new in v_definition)>0 then
    raise notice 'Preview owner validation already present; no change required';
    return;
  end if;

  if position(v_old in v_definition)=0 then
    raise exception 'Expected outgoing-member validation fragment not found; migration stopped';
  end if;

  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected validation fragment is not unique; migration stopped';
  end if;

  execute replace(v_definition,v_old,v_new);
end
$migration$;
