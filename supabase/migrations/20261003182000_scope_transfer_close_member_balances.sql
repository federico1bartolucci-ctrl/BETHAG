-- Scope assigned financial-balance guards to the transfer's workspace and condominium.
-- Member IDs remain the ownership predicate; this prevents cross-tenant rows from blocking closure.
do $migration$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  v_def := pg_get_functiondef('private.close_condominium_member_transfer(uuid)'::regprocedure);

  v_old := 'where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005';
  v_new := 'where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005 and exists (select 1 from public.condominium_member_transfers t where t.id=p_transfer_id and t.workspace_id=i.workspace_id and t.condominium_id=i.condominium_id)';
  if position(v_new in v_def)=0 then
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Assigned installment close-guard anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;

  v_old := 'where a.member_id=v_outgoing and a.amount-a.paid_amount>0.005';
  v_new := 'where a.member_id=v_outgoing and a.amount-a.paid_amount>0.005 and exists (select 1 from public.condominium_member_transfers t where t.id=p_transfer_id and t.workspace_id=a.workspace_id and t.condominium_id=a.condominium_id)';
  if position(v_new in v_def)=0 then
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Assigned allocation close-guard anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;

  v_old := 'where c.member_id=v_outgoing and abs(c.balance)>0.005';
  v_new := 'where c.member_id=v_outgoing and abs(c.balance)>0.005 and exists (select 1 from public.condominium_member_transfers t where t.id=p_transfer_id and t.workspace_id=c.workspace_id and t.condominium_id=c.condominium_id)';
  if position(v_new in v_def)=0 then
    if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
      raise exception 'Assigned carryover close-guard anchor missing or ambiguous';
    end if;
    v_def := replace(v_def,v_old,v_new);
  end if;

  if position(v_new in v_def)=0 then
    -- Last anchor was already scoped above; validate all three predicates independently.
    if position('t.workspace_id=i.workspace_id and t.condominium_id=i.condominium_id' in v_def)=0
       or position('t.workspace_id=a.workspace_id and t.condominium_id=a.condominium_id' in v_def)=0
       or position('t.workspace_id=c.workspace_id and t.condominium_id=c.condominium_id' in v_def)=0 then
      raise exception 'Transfer close-guard scope verification failed';
    end if;
  end if;
  execute v_def;
end
$migration$;
