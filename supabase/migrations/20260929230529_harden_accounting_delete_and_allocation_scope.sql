-- Protect accounting records that already have financial movements.
-- Keep deletion messages explicit and prevent orphaning unit accounting history.

create or replace function public.prevent_paid_installment_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if coalesce(old.paid_amount,0)>0 then
    raise exception 'Non è possibile cancellare una rata con pagamenti registrati: utilizzare una procedura di rettifica del pagamento';
  end if;
  return old;
end;
$function$;

create or replace function public.prevent_paid_allocation_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if coalesce(old.paid_amount,0)>0 then
    raise exception 'Non è possibile cancellare una ripartizione con pagamenti registrati';
  end if;
  return old;
end;
$function$;

create or replace function public.prevent_financial_unit_delete()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_alloc integer;
  v_inst integer;
begin
  select count(*) into v_alloc
  from public.condominium_expense_allocations
  where workspace_id=old.workspace_id
    and condominium_id=old.condominium_id
    and unit_id=old.id;

  select count(*) into v_inst
  from public.condominium_installments
  where workspace_id=old.workspace_id
    and condominium_id=old.condominium_id
    and unit_id=old.id;

  if v_alloc>0 or v_inst>0 then
    raise exception 'L''unità ha movimenti contabili o rate collegate e non può essere eliminata';
  end if;

  return old;
end;
$function$;

drop trigger if exists trg_prevent_paid_installment_delete on public.condominium_installments;
create trigger trg_prevent_paid_installment_delete
before delete on public.condominium_installments
for each row execute function public.prevent_paid_installment_delete();

drop trigger if exists trg_prevent_paid_allocation_delete on public.condominium_expense_allocations;
create trigger trg_prevent_paid_allocation_delete
before delete on public.condominium_expense_allocations
for each row execute function public.prevent_paid_allocation_delete();

drop trigger if exists trg_prevent_financial_unit_delete on public.condominium_units;
create trigger trg_prevent_financial_unit_delete
before delete on public.condominium_units
for each row execute function public.prevent_financial_unit_delete();

create index if not exists condominium_expense_allocations_workspace_ledger_idx
  on public.condominium_expense_allocations (workspace_id, condominium_id, ledger_entry_id);
