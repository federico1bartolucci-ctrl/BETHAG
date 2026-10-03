-- Scope transfer allocation totals and preview rows to the transfer tenant.
do $migration$
declare
  v_sig text;
  v_def text;
  v_old text;
  v_new text;
begin
  foreach v_sig in array array[
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)',
    'public.get_member_transfer_accounting_snapshot(uuid)'
  ] loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if v_sig like 'public.preview_%' or v_sig like 'private.confirm_%' then
      v_old := 'where a.member_id=p_outgoing_member_id';
      v_new := 'where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.member_id=p_outgoing_member_id';
    else
      v_old := 'where a.member_id=t.outgoing_member_id';
      v_new := 'where a.workspace_id=t.workspace_id and a.condominium_id=t.condominium_id and a.member_id=t.outgoing_member_id';
    end if;
    if position(v_new in v_def)=0 then
      if position(v_old in v_def)=0 then
        raise exception 'Allocation total anchor missing in %',v_sig;
      end if;
      v_def := replace(v_def,v_old,v_new);
    elsif position(v_old in v_def)>0 then
      raise exception 'Mixed scoped and unscoped allocation reads remain in %',v_sig;
    end if;
    if v_sig='public.get_member_transfer_accounting_snapshot(uuid)' then
      if position('where a.workspace_id=t.workspace_id and a.condominium_id=t.condominium_id and a.member_id=t.incoming_member_id' in v_def)=0 then
        if position('where a.member_id=t.incoming_member_id' in v_def)=0 then
          raise exception 'Incoming allocation anchor missing in snapshot reader';
        end if;
        v_def := replace(v_def,'where a.member_id=t.incoming_member_id','where a.workspace_id=t.workspace_id and a.condominium_id=t.condominium_id and a.member_id=t.incoming_member_id');
      end if;
    end if;
    if position(v_old in v_def)>0 then
      raise exception 'Unscoped allocation reads remain in %',v_sig;
    end if;
    execute v_def;
  end loop;
end
$migration$;
