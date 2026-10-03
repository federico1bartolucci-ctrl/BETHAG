-- Scope transfer allocation totals and preview rows to the transfer tenant.
do $migration$
declare
  v_sig text;
  v_def text;
  v_old text;
  v_new text;
  v_count integer;
  v_expected integer;
  v_incoming_old text := 'where a.member_id=t.incoming_member_id';
  v_incoming_new text := 'where a.workspace_id=t.workspace_id and a.condominium_id=t.condominium_id and a.member_id=t.incoming_member_id';
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
      -- Confirmation's extraordinary allocation predicate is already scoped by 0740;
      -- this migration scopes only the remaining ordinary outgoing allocation read.
      if v_sig like 'private.confirm_%' then
        v_expected := 1;
      else
        v_expected := 2;
      end if;
    else
      v_old := 'where a.member_id=t.outgoing_member_id';
      v_new := 'where a.workspace_id=t.workspace_id and a.condominium_id=t.condominium_id and a.member_id=t.outgoing_member_id';
      v_expected := 1;
    end if;
    if position(v_new in v_def)=0 then
      v_count := (length(v_def)-length(replace(v_def,v_old,'')))/length(v_old);
      if v_count=0 then
        raise exception 'Allocation total anchor missing in %',v_sig;
      end if;
      if v_count<>v_expected then
        raise exception 'Unexpected outgoing allocation anchor count % in % (expected %)',v_count,v_sig,v_expected;
      end if;
      v_def := replace(v_def,v_old,v_new);
    else
      v_count := (length(v_def)-length(replace(v_def,v_new,'')))/length(v_new);
      if position(v_old in v_def)>0 or v_count<>v_expected then
        raise exception 'Scoped outgoing allocation predicates are duplicated, incomplete, or mixed in % (count=%)',v_sig,v_count;
      end if;
    end if;
    if v_sig='public.get_member_transfer_accounting_snapshot(uuid)' then
      if position(v_incoming_new in v_def)>0 then
        v_count := (length(v_def)-length(replace(v_def,v_incoming_new,'')))/length(v_incoming_new);
        if position(v_incoming_old in v_def)>0 or v_count<>1 then
          raise exception 'Scoped incoming allocation predicate is duplicated, incomplete, or mixed (count=%)',v_count;
        end if;
      else
        v_count := (length(v_def)-length(replace(v_def,v_incoming_old,'')))/length(v_incoming_old);
        if v_count<>1 then
          raise exception 'Unexpected incoming allocation anchor count % in snapshot reader (expected one scoped or unscoped anchor)',v_count;
        end if;
        v_def := replace(v_def,v_incoming_old,v_incoming_new);
      end if;
    end if;
    if position(v_old in v_def)>0 then
      raise exception 'Unscoped allocation reads remain in %',v_sig;
    end if;
    execute v_def;
  end loop;
end
$migration$;
