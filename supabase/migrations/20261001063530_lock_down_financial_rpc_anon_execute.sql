revoke execute on function public.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) from anon;
revoke execute on function public.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) from anon;
revoke execute on function public.confirm_allocation_intake(uuid, uuid) from anon;
revoke execute on function public.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) from anon;
revoke execute on function public.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) from anon;
revoke execute on function public.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) from anon;

revoke execute on function public.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) from public;
revoke execute on function public.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) from public;
revoke execute on function public.confirm_allocation_intake(uuid, uuid) from public;
revoke execute on function public.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) from public;
revoke execute on function public.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) from public;
revoke execute on function public.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) from public;
