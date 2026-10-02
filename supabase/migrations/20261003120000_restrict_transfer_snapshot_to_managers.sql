-- Accounting snapshots expose personal and financial transfer history.
-- Restrict them to users allowed to manage the condominium module, matching
-- transfer confirmation and preview authorization.
do $migration$
declare
  v_definition text;
  v_old text := $old$not private.can_access_workspace_module(t.workspace_id,'condomini')$old$;
  v_new text := $new$not private.can_manage_workspace_module(t.workspace_id,'condomini')$new$;
begin
  v_definition := pg_get_functiondef('public.get_member_transfer_accounting_snapshot(uuid)'::regprocedure);

  if position(v_new in v_definition)>0 then
    raise notice 'Snapshot manager authorization already present; no change required';
    return;
  end if;

  if position(v_old in v_definition)=0 then
    raise exception 'Expected snapshot authorization fragment not found; migration stopped';
  end if;

  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected snapshot authorization fragment is not unique; migration stopped';
  end if;

  execute replace(v_definition,v_old,v_new);
end
$migration$;
