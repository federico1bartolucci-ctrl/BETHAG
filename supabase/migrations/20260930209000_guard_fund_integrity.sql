-- BETHAG: database-level integrity for condominium funds.
create or replace function public.guard_fund_integrity()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
  if new.target_amount is null or new.target_amount < 0
     or new.allocated_amount is null or new.allocated_amount < 0
     or new.used_amount is null or new.used_amount < 0 then
    raise exception 'Gli importi del fondo devono essere numerici e non negativi';
  end if;
  if new.used_amount > new.allocated_amount + 0.005 then
    raise exception 'L''importo utilizzato non può superare l''importo allocato';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_fund_integrity on public.condominium_funds;
create trigger trg_guard_fund_integrity
before insert or update on public.condominium_funds
for each row execute function public.guard_fund_integrity();

revoke all on function public.guard_fund_integrity() from public;
grant execute on function public.guard_fund_integrity() to authenticated;
