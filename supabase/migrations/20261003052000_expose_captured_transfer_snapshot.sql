-- Expose the immutable confirmation-time accounting snapshot in the transfer detail RPC.
-- Keep live balances and confirmation-time values distinct for auditability.
do $migration$
declare
  v_definition text;
  v_old text := $old$'transfer', jsonb_build_object($old$;
  v_new text := $new
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique transfer JSON insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;captured_accounting_snapshot', coalesce(t.data->'accounting_snapshot','{}'::jsonb),
   'transfer', jsonb_build_object($new$;
  v_key text := '''captured_accounting_snapshot''';
  v_source text := 'coalesce(t.data->''accounting_snapshot'',''{}''::jsonb)';
begin
  v_definition := pg_get_functiondef('public.get_member_transfer_accounting_snapshot(uuid)'::regprocedure);
  if position(v_key in v_definition)>0 or position(v_source in v_definition)>0 then
    if (length(v_definition)-length(replace(v_definition,v_key,'')))<>length(v_key)
       or (length(v_definition)-length(replace(v_definition,v_source,'')))<>length(v_source) then
      raise exception 'Captured snapshot key or source is missing, duplicated, or malformed';
    end if;
    raise notice 'Captured snapshot is already exposed exactly once from the expected source';
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique transfer JSON insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;