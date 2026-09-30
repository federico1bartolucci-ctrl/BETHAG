-- BETHAG: protect expense allocations once they have financial history.
create or replace function public.guard_expense_allocation_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    if coalesce(old.paid_amount,0) > 0.005 then
      raise exception 'La ripartizione ha pagamenti registrati e non può essere cancellata';
    end if;
    if exists (
      select 1 from public.condominium_installments i
      where i.workspace_id = old.workspace_id
        and i.condominium_id = old.condominium_id
        and i.ledger_entry_id = old.ledger_entry_id
        and (i.unit_id is not distinct from old.unit_id)
    ) then
      raise exception 'La ripartizione è collegata a rate e non può essere cancellata';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.paid_amount is distinct from old.paid_amount then
      raise exception 'Il pagato della ripartizione viene aggiornato esclusivamente dai movimenti di pagamento';
    end if;

    if coalesce(old.paid_amount,0) > 0.005 and (
      new.amount is distinct from old.amount or
      new.unit_id is distinct from old.unit_id or
      new.ledger_entry_id is distinct from old.ledger_entry_id or
      new.condominium_id is distinct from old.condominium_id or
      new.workspace_id is distinct from old.workspace_id
    ) then
      raise exception 'Una ripartizione con pagamenti registrati non può essere scollegata o modificata nei dati contabili';
    end if;

    if exists (
      select 1 from public.condominium_installments i
      where i.workspace_id = old.workspace_id
        and i.condominium_id = old.condominium_id
        and i.ledger_entry_id = old.ledger_entry_id
        and (i.unit_id is not distinct from old.unit_id)
    ) and (
      new.amount is distinct from old.amount or
      new.unit_id is distinct from old.unit_id or
      new.ledger_entry_id is distinct from old.ledger_entry_id or
      new.condominium_id is distinct from old.condominium_id or
      new.workspace_id is distinct from old.workspace_id
    ) then
      raise exception 'Una ripartizione collegata a rate non può essere scollegata o modificata nei dati contabili';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_expense_allocation_integrity on public.condominium_expense_allocations;
create trigger trg_guard_expense_allocation_integrity
before update or delete on public.condominium_expense_allocations
for each row execute function public.guard_expense_allocation_integrity();

revoke all on function public.guard_expense_allocation_integrity() from public;
grant execute on function public.guard_expense_allocation_integrity() to authenticated;
