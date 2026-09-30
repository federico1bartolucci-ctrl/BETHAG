-- BETHAG: fiscal years are historical accounting boundaries and cannot be deleted.
create or replace function public.prevent_fiscal_year_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count bigint;
begin
  select count(*) into v_count from public.condominium_ledger_entries where fiscal_year_id=old.id;
  if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene movimenti contabili'; end if;

  select count(*) into v_count from public.condominium_installments where fiscal_year_id=old.id;
  if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene rate'; end if;

  select count(*) into v_count from public.condominium_budgets where fiscal_year_id=old.id;
  if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene voci di preventivo'; end if;

  select count(*) into v_count from public.condominium_consumption_readings where fiscal_year_id=old.id;
  if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene dati di consumo'; end if;

  select count(*) into v_count
  from public.condominium_fiscal_carryovers
  where source_fiscal_year_id=old.id or target_fiscal_year_id=old.id;
  if v_count>0 then raise exception 'L''esercizio non può essere cancellato: esistono partite riportate collegate'; end if;

  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere cancellato';
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_fiscal_year_delete on public.condominium_fiscal_years;
create trigger trg_prevent_fiscal_year_delete
before delete on public.condominium_fiscal_years
for each row execute function public.prevent_fiscal_year_delete();

revoke all on function public.prevent_fiscal_year_delete() from public;
grant execute on function public.prevent_fiscal_year_delete() to authenticated;
