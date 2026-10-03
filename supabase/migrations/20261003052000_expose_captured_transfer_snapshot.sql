-- Expose the immutable confirmation-time accounting snapshot in the transfer detail RPC.
-- Keep live balances and confirmation-time values distinct for auditability.
do $migration$
declare
  v_definition text;
  v_old text := $old$'transfer', jsonb_build_object($old$;
  v_new text := $new$'captured_accounting_snapshot', coalesce(t.data->'accounting_snapshot','{}'::jsonb),
   'transfer', jsonb_build_object($new$;
begin
  v_definition := pg_get_functiondef('public.get_member_transfer_accounting_snapshot(uuid)'::regprocedure);
  if position('captured_accounting_snapshot' in v_definition)>0 then
    if position('coalesce(t.data->''accounting_snapshot'',''{}''::jsonb)' in v_definition)=0 then
      raise exception 'Captured snapshot key exists but is not sourced from transfer data.accounting_snapshot';
    end if;
    raise notice 'Captured snapshot is already exposed from the expected source';
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique transfer JSON insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;