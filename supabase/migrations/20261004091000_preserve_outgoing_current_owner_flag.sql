-- Keep the former owner explicitly marked as non-current when a transfer is confirmed.
-- The lifecycle function replacement omitted this flag although the earlier implementation set it.
do $migration$
declare
  v_definition text;
  v_old text := $old$'position_status','In chiusura','subentro_date',p_transfer_date,'subentro_type',p_transfer_type$old$;
  v_new text := $new$'position_status','In chiusura','current_owner',false,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type$new$;
  v_old_count integer;
  v_new_count integer;
begin
  v_definition := pg_catalog.pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  );
  v_old_count := (length(v_definition)-length(replace(v_definition,v_old,''))) / length(v_old);
  v_new_count := (length(v_definition)-length(replace(v_definition,v_new,''))) / length(v_new);
  if v_old_count=1 and v_new_count=0 then
    execute replace(v_definition,v_old,v_new);
  elsif v_old_count=0 and v_new_count=1 then
    raise notice 'Outgoing owner flag already present';
  else
    raise exception 'Expected one outgoing-owner lifecycle fragment (old %, corrected %); migration stopped',v_old_count,v_new_count;
  end if;
end
$migration$;
