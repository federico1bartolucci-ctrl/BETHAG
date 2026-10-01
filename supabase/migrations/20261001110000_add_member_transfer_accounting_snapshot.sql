create or replace function public.get_member_transfer_accounting_snapshot(p_transfer_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare t public.condominium_member_transfers%rowtype; result jsonb;
begin
 select * into t from public.condominium_member_transfers where id=p_transfer_id;
 if t.id is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
 if not private.can_access_workspace_module(t.workspace_id,'condomini') then raise exception 'FORBIDDEN'; end if;
 select jsonb_build_object(
  'transfer',jsonb_build_object('id',t.id,'unit_id',t.unit_id,'outgoing_member_id',t.outgoing_member_id,'incoming_member_id',t.incoming_member_id,'transfer_date',t.transfer_date,'transfer_type',t.transfer_type,'status',t.status),
  'outgoing',jsonb_build_object(
   'installments_due_before',coalesce((select sum(i.amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date<=t.transfer_date),0),
   'installments_paid_before',coalesce((select sum(i.paid_amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date<=t.transfer_date),0),
   'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date<=t.transfer_date),0),
   'allocations_before',coalesce((select sum(a.amount) from condominium_expense_allocations a where a.member_id=t.outgoing_member_id and (a.due_date is null or a.due_date<=t.transfer_date)),0)
  ),
  'post_transfer',jsonb_build_object(
   'installments_after',coalesce((select sum(i.amount) from condominium_installments i where i.member_id=t.incoming_member_id and i.due_date>t.transfer_date),0),
   'allocations_after',coalesce((select sum(a.amount) from condominium_expense_allocations a where a.member_id=t.incoming_member_id and (a.due_date is null or a.due_date>t.transfer_date)),0)
  ),
  'unit_expenses',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'expense_type',l.expense_type,'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,'amount',l.amount,'assembly_id',l.assembly_id,'deliberation_before_transfer',case when l.deliberation_date is not null and l.deliberation_date<=t.transfer_date then true else false end) order by coalesce(l.deliberation_date,l.entry_date),l.id) from condominium_ledger_entries l where l.unit_id=t.unit_id and l.condominium_id=t.condominium_id and (l.entry_date<=t.transfer_date or (l.deliberation_date is not null and l.deliberation_date<=t.transfer_date))),'[]'::jsonb)
 ) into result;
 return result;
end; $$;
revoke execute on function public.get_member_transfer_accounting_snapshot(uuid) from anon,public;
grant execute on function public.get_member_transfer_accounting_snapshot(uuid) to authenticated;
