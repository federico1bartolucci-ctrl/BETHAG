-- Expand transfer preview with future installments still assigned to outgoing owner.
do $migration$
declare
  v_definition text;
  v_old text := $old$'installments_before',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),'[]'::jsonb),
  'extraordinary_deliberated_before_due_after',$old$;
  v_new text := $new$'installments_before',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),'[]'::jsonb),
  'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.member_id=p_outgoing_member_id and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),
  'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.amount-i.paid_amount>0.005),0),
  'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),
  'extraordinary_deliberated_before_due_after',$new$;
begin
  select pg_get_functiondef(p.oid) into v_definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='preview_condominium_member_transfer'
    and pg_get_function_identity_arguments(p.oid)='p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date';
  if v_definition is null then raise exception 'Preview transfer function not found'; end if;
  if position('installments_after' in v_definition)>0 then
    if position('outstanding_total' in v_definition)=0
       or position('outstanding_due_after' in v_definition)=0
       or position('i.member_id=p_outgoing_member_id' in v_definition)=0
       or position('(i.due_date is null or i.due_date>p_transfer_date)' in v_definition)=0 then
      raise exception 'Future installment preview exists but expected balance/date filters are incomplete';
    end if;
    raise notice 'Future installments already included with expected filters';
    return;
  end if;
  if length(v_definition)-length(replace(v_definition,v_old,'')) <> length(v_old) then
    raise exception 'Expected unique installments insertion point; migration stopped';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;