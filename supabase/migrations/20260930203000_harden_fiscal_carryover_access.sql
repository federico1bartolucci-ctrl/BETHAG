-- BETHAG: fiscal carryovers are generated/adjusted by controlled RPCs only.
revoke insert, update, delete on public.condominium_fiscal_carryovers from authenticated;
revoke insert, update, delete on public.condominium_fiscal_carryovers from anon;
grant select on public.condominium_fiscal_carryovers to authenticated;

revoke insert, update, delete on public.condominium_fiscal_carryover_compensations from authenticated;
revoke insert, update, delete on public.condominium_fiscal_carryover_compensations from anon;
grant select on public.condominium_fiscal_carryover_compensations to authenticated;
