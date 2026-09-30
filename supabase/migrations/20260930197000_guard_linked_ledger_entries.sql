-- BETHAG: protect ledger entries already used by allocations/installments
create or replace function public.guard_ledger_entry_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_allocations integer := 0;
  v_installments integer := 0;
begin
  if tg_op = 'DELETE' then
    select count(*) into v_allocations
    from public.condominium_expense_allocations
    where workspace_id = old.workspace_id
      and condominium_id = old.condominium_id
      and ledger_entry_id = old.id;

    select count(*) into v_installments
    from public.condominium_installments
    where workspace_id = old.workspace_id
      and condominium_id = old.condominium_id
      and ledger_entry_id = old.id;

    if v_allocations > 0 or v_installments > 0 then
      raise exception 'La voce contabile è collegata a ripartizioni o rate e non può essere cancellata';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    select count(*) into v_allocations
    from public.condominium_expense_allocations
    where workspace_id = old.workspace_id
      and condominium_id = old.condominium_id
      and ledger_entry_id = old.id;

    select count(*) into v_installments
    from public.condominium_installments
    where workspace_id = old.workspace_id
      and condominium_id = old.condominium_id
      and ledger_entry_id = old.id;

    if (v_allocations > 0 or v_installments > 0)
       and (
         new.amount is distinct from old.amount
         or new.direction is distinct from old.direction
         or new.fiscal_year_id is distinct from old.fiscal_year_id
         or new.condominium_id is distinct from old.condominium_id
         or new.workspace_id is distinct from old.workspace_id
       ) then
      raise exception 'La voce contabile è già collegata a ripartizioni o rate: importo, direzione ed esercizio non possono essere modificati';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_ledger_entry_integrity on public.condominium_ledger_entries;

create trigger trg_guard_ledger_entry_integrity
before update or delete on public.condominium_ledger_entries
for each row
execute function public.guard_ledger_entry_integrity();

revoke all on function public.guard_ledger_entry_integrity() from public;
grant execute on function public.guard_ledger_entry_integrity() to authenticated;
