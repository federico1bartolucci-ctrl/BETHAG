-- Persist future-due installments in immutable transfer snapshot as well as preview.
do $migration$
declare
  v_definition text;
  v_old text := $old$'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'allocations_before',$old$;
  v_new text := $new$'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
    'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.member_id=p_outgoing_member_id and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),
    'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.amount-i.paid_amount>0.005),0),
    'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),
    'allocations_before',$new$;
begin
  select pg_get_functiondef(p.oid) into v_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='confirm_condominium_member_transfer'
    and pg_get_function_identity_arguments(p.oid)='p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb';
  if v_definition is null then raise exception 'Transfer confirmation function not found'; end if;
  if position('outstanding_due_after' in v_definition)>0 then
    if (length(v_definition)-length(replace(v_definition,'''installments_after''','')))<>length('''installments_after''')
       or (length(v_definition)-length(replace(v_definition,'''outstanding_total''','')))<>length('''outstanding_total''')
       or (length(v_definition)-length(replace(v_definition,'''outstanding_due_after''','')))<>length('''outstanding_due_after''')
       or position('i.member_id=p_outgoing_member_id' in v_definition)=0
       or position('(i.due_date is null or i.due_date>p_transfer_date)' in v_definition)=0
       or position('i.amount-i.paid_amount>0.005' in v_definition)=0 then
      raise exception 'Future installment snapshot is incomplete, duplicated, or missing source/filters';
    end if;
    raise notice 'Future installments already captured with expected filters';
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique snapshot insertion point missing or duplicated';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;