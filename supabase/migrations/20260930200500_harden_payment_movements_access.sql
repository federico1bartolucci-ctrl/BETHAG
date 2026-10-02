-- BETHAG: payment movements are ledger evidence and must only be created through the validated RPC
alter function public.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text) security definer;

revoke insert, update, delete on public.condominium_payment_movements from authenticated;
revoke insert, update, delete on public.condominium_payment_movements from anon;
grant select on public.condominium_payment_movements to authenticated;
