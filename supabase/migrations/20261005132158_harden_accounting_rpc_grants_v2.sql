-- Harden public accounting RPC entry points: authenticated only.
revoke execute on function public.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) from public, anon;
revoke execute on function public.confirm_allocation_intake(uuid,uuid) from public, anon;
revoke execute on function public.generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) from public, anon;
revoke execute on function public.generate_consumption_allocations(uuid,uuid,uuid,uuid,text) from public, anon;
revoke execute on function public.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) from public, anon;
revoke execute on function public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) from public, anon;
grant execute on function public.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text) to authenticated;
grant execute on function public.confirm_allocation_intake(uuid,uuid) to authenticated;
grant execute on function public.generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) to authenticated;
grant execute on function public.generate_consumption_allocations(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) to authenticated;
