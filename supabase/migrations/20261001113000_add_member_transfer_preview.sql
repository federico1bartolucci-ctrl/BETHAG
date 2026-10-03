create or replace function public.preview_condominium_member_transfer(
 p_unit_id uuid,p_outgoing_member_id uuid,p_transfer_date date)
returns jsonb language plpgsql security invoker set search_path=public
as $$
declare v_workspace uuid; v_condominium uuid; v_result jsonb;
begin
 if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
 select u.workspace_id,u.condominium_id into v_workspace,v_condominium from public.condominium_units u where u.id=p_unit_id;
 if v_workspace is null or not private.can_access_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.condominium_members m where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;
 select jsonb_build_object(
  'transfer_date',p_transfer_date,'unit_id',p_unit_id,'outgoing_member_id',p_outgoing_member_id,
  'outstanding_before',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'installments_before',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),'[]'::jsonb),
  'extraordinary_deliberated_before_due_after',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'amount',a.amount,'paid_amount',a.paid_amount,'due_date',a.due_date,'status',a.status,'ledger_entry_id',a.ledger_entry_id,'deliberation_date',l.deliberation_date,'description',l.description) order by l.deliberation_date,a.due_date,a.id) from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),'[]'::jsonb),
  'unit_expenses',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'expense_type',l.expense_type,'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,'amount',l.amount,'assembly_id',l.assembly_id) order by coalesce(l.deliberation_date,l.entry_date),l.id) from public.condominium_ledger_entries l where l.unit_id=p_unit_id and l.condominium_id=v_condominium and l.workspace_id=v_workspace and l.direction='Uscita' and (l.entry_date<=p_transfer_date or (l.deliberation_date is not null and l.deliberation_date<=p_transfer_date))),'[]'::jsonb),
  'review_flags',jsonb_build_object(
   'unpaid_before_transfer',exists(select 1 from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date and i.amount-i.paid_amount>0.005),
   'extraordinary_deliberated_before_due_after',exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),
   'legal_liability_review_required',true)) into v_result;
 return v_result;
end; $$;
revoke execute on function public.preview_condominium_member_transfer(uuid,uuid,date) from anon,public;
grant execute on function public.preview_condominium_member_transfer(uuid,uuid,date) to authenticated;