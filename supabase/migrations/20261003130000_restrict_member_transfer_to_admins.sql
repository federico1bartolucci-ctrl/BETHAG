-- Ownership transfer is an administrator-only workflow in the BETHAG UI.
-- Keep collaborators' ordinary module permissions unchanged, but enforce the
-- same administrator-only boundary for all transfer RPC entry points.
do $migration$
declare
  v_signature text;
  v_definition text;
  v_old text;
  v_new text;
begin
  foreach v_signature in array array[
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)',
    'private.close_condominium_member_transfer(uuid)',
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'public.get_member_transfer_accounting_snapshot(uuid)'
  ]
  loop
    v_definition := pg_get_functiondef(v_signature::regprocedure);

    if v_signature like 'public.get_member_transfer_accounting_snapshot%' then
      v_old := $old$not private.can_manage_workspace_module(t.workspace_id,'condomini')$old$;
      v_new := $new$not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id=t.workspace_id
      and wm.user_id=auth.uid()
      and wm.active=true
      and wm.role='admin'
  )$new$;
    else
      v_old := $old$not private.can_manage_workspace_module(v_workspace,'condomini')$old$;
      v_new := $new$not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id=v_workspace
      and wm.user_id=auth.uid()
      and wm.active=true
      and wm.role='admin'
  )$new$;
    end if;

    if position(v_new in v_definition)>0 then
      raise notice 'Administrator-only authorization already present for %',v_signature;
      continue;
    end if;

    if position(v_old in v_definition)=0 then
      raise exception 'Expected manager authorization fragment not found for %; migration stopped',v_signature;
    end if;

    if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
      raise exception 'Expected manager authorization fragment is not unique for %; migration stopped',v_signature;
    end if;

    execute replace(v_definition,v_old,v_new);
  end loop;
end
$migration$;
