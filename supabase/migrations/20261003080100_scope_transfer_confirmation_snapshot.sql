-- Scope the immutable transfer-confirmation accounting snapshot to its tenant and condominium.
-- The outgoing member UUID is not a substitute for explicit tenant scoping.
do $migration$
declare
  v_def text;
  v_old text[] := array[
    $old$'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$old$,
    $old$'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$old$,
    $old$'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$old$,
    $old$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),$old$
  ];
  v_new text[] := array[
    $new$'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),$new$,
    $new$'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),$new$,
    $new$'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),$new$,
    $new$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),$new$
  ];
  v_old_count integer;
  v_new_count integer;
  v_idx integer;
begin
  v_def := pg_catalog.pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  );
  for v_idx in 1..array_length(v_old,1) loop
    v_old_count := (length(v_def)-length(replace(v_def,v_old[v_idx],''))) / length(v_old[v_idx]);
    v_new_count := (length(v_def)-length(replace(v_def,v_new[v_idx],''))) / length(v_new[v_idx]);
    if v_old_count=1 and v_new_count=0 then
      v_def := replace(v_def,v_old[v_idx],v_new[v_idx]);
    elsif v_old_count=0 and v_new_count=1 then
      null;
    else
      raise exception 'Transfer snapshot tenant-scope anchor % missing, duplicated, or mixed (old %, scoped %)',v_idx,v_old_count,v_new_count;
    end if;
  end loop;
  execute v_def;
end
$migration$;
