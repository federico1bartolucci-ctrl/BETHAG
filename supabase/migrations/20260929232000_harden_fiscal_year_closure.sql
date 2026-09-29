-- Enforce fiscal-year closure at database level.
-- Closed fiscal years and their accounting records are immutable.

create or replace function public.prevent_closed_fiscal_year_mutation()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_year_id uuid;
  v_status text;
begin
  if tg_table_name in ('condominium_ledger_entries','condominium_installments','condominium_budgets') then
    v_year_id := case when tg_op='DELETE' then old.fiscal_year_id else new.fiscal_year_id end;
  elsif tg_table_name='condominium_expense_allocations' then
    select fiscal_year_id into v_year_id
    from public.condominium_ledger_entries
    where id=case when tg_op='DELETE' then old.ledger_entry_id else new.ledger_entry_id end;
  end if;

  if v_year_id is not null then
    select status into v_status
    from public.condominium_fiscal_years
    where id=v_year_id;
    if v_status='Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere modificato';
    end if;
  end if;

  return case when tg_op='DELETE' then old else new end;
end;
$function$;

create or replace function public.prevent_closed_fiscal_year_payment_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_year_id uuid;
  v_status text;
begin
  select i.fiscal_year_id into v_year_id
  from public.condominium_installments i
  where i.id=old.installment_id;

  if v_year_id is not null then
    select status into v_status
    from public.condominium_fiscal_years
    where id=v_year_id;
    if v_status='Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e i pagamenti non possono essere modificati';
    end if;
  end if;

  return old;
end;
$function$;

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

drop trigger if exists trg_prevent_closed_fiscal_year_mutation_ledger on public.condominium_ledger_entries;
create trigger trg_prevent_closed_fiscal_year_mutation_ledger
before insert or update or delete on public.condominium_ledger_entries
for each row execute function public.prevent_closed_fiscal_year_mutation();

drop trigger if exists trg_prevent_closed_fiscal_year_mutation_installments on public.condominium_installments;
create trigger trg_prevent_closed_fiscal_year_mutation_installments
before insert or update or delete on public.condominium_installments
for each row execute function public.prevent_closed_fiscal_year_mutation();

drop trigger if exists trg_prevent_closed_fiscal_year_mutation_budgets on public.condominium_budgets;
create trigger trg_prevent_closed_fiscal_year_mutation_budgets
before insert or update or delete on public.condominium_budgets
for each row execute function public.prevent_closed_fiscal_year_mutation();

drop trigger if exists trg_prevent_closed_fiscal_year_mutation_allocations on public.condominium_expense_allocations;
create trigger trg_prevent_closed_fiscal_year_mutation_allocations
before insert or update or delete on public.condominium_expense_allocations
for each row execute function public.prevent_closed_fiscal_year_mutation();

drop trigger if exists trg_prevent_closed_fiscal_year_payment_delete on public.condominium_payment_movements;
create trigger trg_prevent_closed_fiscal_year_payment_delete
before delete on public.condominium_payment_movements
for each row execute function public.prevent_closed_fiscal_year_payment_delete();

drop trigger if exists trg_prevent_closed_fiscal_year_delete on public.condominium_fiscal_years;
create trigger trg_prevent_closed_fiscal_year_delete
before delete on public.condominium_fiscal_years
for each row execute function public.prevent_closed_fiscal_year_delete();
