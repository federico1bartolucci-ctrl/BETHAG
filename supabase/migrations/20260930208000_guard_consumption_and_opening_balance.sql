-- BETHAG: protect accounting inputs already used to build historical allocations.
create or replace function public.guard_consumption_reading_integrity()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
  if exists (
    select 1
    from public.condominium_expense_allocations a
    join public.condominium_ledger_entries l on l.id=a.ledger_entry_id
    where a.workspace_id=old.workspace_id
      and a.condominium_id=old.condominium_id
      and l.fiscal_year_id=old.fiscal_year_id
      and a.allocation_basis = 'Consumo - ' || trim(old.service_type)
      and a.unit_id = old.unit_id
  ) then
    raise exception 'La lettura di consumo è già utilizzata in un riparto e non può essere modificata o cancellata';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_guard_consumption_reading_integrity on public.condominium_consumption_readings;
create trigger trg_guard_consumption_reading_integrity
before update or delete on public.condominium_consumption_readings
for each row execute function public.guard_consumption_reading_integrity();

revoke all on function public.guard_consumption_reading_integrity() from public;
grant execute on function public.guard_consumption_reading_integrity() to authenticated;

-- Once carryovers have been generated, the target opening balance is the
-- accounting consequence of the previous closed exercise and cannot be edited manually.
create or replace function public.guard_fiscal_year_opening_balance()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
  if new.opening_balance is distinct from old.opening_balance
     and exists (
       select 1
       from public.condominium_fiscal_carryovers c
       where c.workspace_id=old.workspace_id
         and c.condominium_id=old.condominium_id
         and c.target_fiscal_year_id=old.id
     ) then
    raise exception 'Il saldo iniziale è vincolato ai riporti dell''esercizio precedente e non può essere modificato manualmente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_fiscal_year_opening_balance on public.condominium_fiscal_years;
create trigger trg_guard_fiscal_year_opening_balance
before update on public.condominium_fiscal_years
for each row execute function public.guard_fiscal_year_opening_balance();

revoke all on function public.guard_fiscal_year_opening_balance() from public;
grant execute on function public.guard_fiscal_year_opening_balance() to authenticated;
