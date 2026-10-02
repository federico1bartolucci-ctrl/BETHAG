-- Restrict financial transfer previews to users who can manage condominium records.
-- The preview contains personal and accounting data and must not be available
-- to ordinary portal readers. Guard the replacement to avoid changing an
-- unexpected live definition.
do $migration$
declare
  v_definition text;
  v_old text := $old$not private.can_access_workspace_module(v_workspace,'condomini')$old$;
  v_new text := $new$not private.can_manage_workspace_module(v_workspace,'condomini')$new$;
begin
  v_definition := pg_get_functiondef('public.preview_condominium_member_transfer(uuid,uuid,date)'::regprocedure);

  if position(v_new in v_definition)>0 then
    raise notice 'Preview manager authorization already present; no change required';
    return;
  end if;

  if position(v_old in v_definition)=0 then
    raise exception 'Expected preview authorization fragment not found; migration stopped';
  end if;

  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected preview authorization fragment is not unique; migration stopped';
  end if;

  execute replace(v_definition,v_old,v_new);
end
$migration$;
