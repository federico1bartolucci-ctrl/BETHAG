-- Protect fiscal-year deletion from orphaning accounting data.
-- Closed-year immutability is enforced by the existing
-- prevent_closed_fiscal_year_record_mutation / prevent_closed_condominium_accounting
-- triggers already used by the accounting schema.

create or replace function public.prevent_closed_fiscal_year_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere eliminato';
  end if;

  if exists (select 1 from public.condominium_ledger_entries where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_installments where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_budgets where fiscal_year_id=old.id) then
    raise exception 'L''esercizio ha dati contabili collegati e non può essere eliminato';
  end if;

  return old;
end;
$function$;

drop trigger if exists trg_prevent_closed_fiscal_year_delete on public.condominium_fiscal_years;
create trigger trg_prevent_closed_fiscal_year_delete
before delete on public.condominium_fiscal_years
for each row execute function public.prevent_closed_fiscal_year_delete();
