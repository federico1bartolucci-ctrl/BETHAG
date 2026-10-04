-- Scope every accounting read in the immutable member-transfer snapshot to the locked tenant.
-- Unit-unassigned installments/carryovers remain attached to the transferred unit.
do $migration$
declare
  v_def text;
  v_old text[] := array[
    $o$'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$o$,
    $o$'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$o$,
    $o$'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$o$,
    $o$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),$o$,
    $o$'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'assignment_scope',case when i.member_id is null then 'unit_unassigned' else 'member' end,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),$o$,
    $o$'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.amount-i.paid_amount>0.005),0),$o$,
    $o$'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),$o$,
    $o$'unit_unassigned_carryovers',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'balance',c.balance,'kind',c.kind,'status',c.status,'source_fiscal_year_id',c.source_fiscal_year_id,'target_fiscal_year_id',c.target_fiscal_year_id) order by c.created_at,c.id) from public.condominium_fiscal_carryovers c where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),'[]'::jsonb),$o$,
    $o$where a.workspace_id=v_workspace and a.condominium_id=v_condominium
        and a.member_id=p_outgoing_member_id
        and l.expense_type='Straordinaria'
        and l.deliberation_date is not null
        and l.deliberation_date<=p_transfer_date
        and (a.due_date is null or a.due_date>p_transfer_date)$o$
  ];
  v_new text[] := array[
    $n$'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$n$,
    $n$'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$n$,
    $n$'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),$n$,
    $n$'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.workspace_id=v_workspace and a.condominium_id=v_condominium and a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),$n$,
    $n$'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'assignment_scope',case when i.member_id is null then 'unit_unassigned' else 'member' end,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),$n$,
    $n$'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.amount-i.paid_amount>0.005),0),$n$,
    $n$'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.workspace_id=v_workspace and i.condominium_id=v_condominium and (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),$n$,
    $n$'unit_unassigned_carryovers',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'balance',c.balance,'kind',c.kind,'status',c.status,'source_fiscal_year_id',c.source_fiscal_year_id,'target_fiscal_year_id',c.target_fiscal_year_id) order by c.created_at,c.id) from public.condominium_fiscal_carryovers c where c.workspace_id=v_workspace and c.condominium_id=v_condominium and c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),'[]'::jsonb),$n$,
    $n$where a.workspace_id=v_workspace and a.condominium_id=v_condominium
        and l.workspace_id=v_workspace and l.condominium_id=v_condominium
        and a.member_id=p_outgoing_member_id
        and l.expense_type='Straordinaria'
        and l.deliberation_date is not null
        and l.deliberation_date<=p_transfer_date
        and (a.due_date is null or a.due_date>p_transfer_date)$n$
  ];
  v_old_count integer;
  v_new_count integer;
  v_idx integer;
begin
  v_def := pg_catalog.pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  );
  if array_length(v_old,1) <> 9 or array_length(v_new,1) <> 9 then
    raise exception 'Expected nine transfer snapshot scope anchors';
  end if;
  for v_idx in 1..array_length(v_old,1) loop
    v_old_count := (length(v_def)-length(replace(v_def,v_old[v_idx],''))) / length(v_old[v_idx]);
    v_new_count := (length(v_def)-length(replace(v_def,v_new[v_idx],''))) / length(v_new[v_idx]);
    if v_old_count=1 and v_new_count=0 then
      v_def := replace(v_def,v_old[v_idx],v_new[v_idx]);
    elsif v_old_count=0 and v_new_count=1 then
      null;
    else
      raise exception 'Transfer snapshot scope anchor % missing, duplicated, or mixed (old %, scoped %)',v_idx,v_old_count,v_new_count;
    end if;
  end loop;
  execute v_def;
end
$migration$;
