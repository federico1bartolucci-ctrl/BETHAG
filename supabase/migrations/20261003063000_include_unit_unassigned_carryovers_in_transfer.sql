-- Preserve unit-level fiscal carryovers in the transfer preview and immutable snapshot.
do $$
declare
  v_sig text;
  v_def text;
  v_anchor text := '''extraordinary_deliberated_before_due_after'',coalesce(';
  v_insert text := '''unit_unassigned_carryovers'',coalesce((select jsonb_agg(jsonb_build_object(''id'',c.id,''balance'',c.balance,''kind'',c.kind,''status'',c.status,''source_fiscal_year_id'',c.source_fiscal_year_id,''target_fiscal_year_id'',c.target_fiscal_year_id) order by c.created_at,c.id) from public.condominium_fiscal_carryovers c where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),''[]''::jsonb),';
begin
  foreach v_sig in array array[
    'public.preview_condominium_member_transfer(uuid,uuid,date)',
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'
  ] loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if position(v_anchor in v_def)=0 then
      if position('''unit_unassigned_carryovers''' in v_def)>0 then
        continue;
      end if;
      raise exception 'Transfer snapshot insertion anchor missing for %',v_sig;
    end if;
    v_def := replace(v_def,v_anchor,v_insert||v_anchor);
    execute v_def;
  end loop;
end $$;