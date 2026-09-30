-- BETHAG: prevent destructive cascades on accounting history.
-- Explicit triggers run before parent deletion and block when dependent accounting
-- records exist, so historical records cannot disappear through FK CASCADE.
create or replace function public.guard_ledger_parent_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists (select 1 from public.condominium_expense_allocations where ledger_entry_id=old.id) then
    raise exception 'La voce contabile ha ripartizioni collegate e non può essere cancellata';
  end if;
  return old;
end; $$;

drop trigger if exists trg_guard_ledger_parent_delete on public.condominium_ledger_entries;
create trigger trg_guard_ledger_parent_delete before delete on public.condominium_ledger_entries
for each row execute function public.guard_ledger_parent_delete();

create or replace function public.guard_millesimal_table_parent_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists (select 1 from public.condominium_expense_allocations where allocation_table_id=old.id) then
    raise exception 'La tabella millesimale ha ripartizioni collegate e non può essere cancellata';
  end if;
  if exists (select 1 from public.condominium_millesimal_values where table_id=old.id) then
    raise exception 'La tabella millesimale ha quote collegate e non può essere cancellata';
  end if;
  return old;
end; $$;

drop trigger if exists trg_guard_millesimal_table_parent_delete on public.condominium_millesimal_tables;
create trigger trg_guard_millesimal_table_parent_delete before delete on public.condominium_millesimal_tables
for each row execute function public.guard_millesimal_table_parent_delete();

create or replace function public.guard_installment_parent_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists (select 1 from public.condominium_payment_movements where installment_id=old.id) then
    raise exception 'La rata ha movimenti di pagamento collegati e non può essere cancellata';
  end if;
  return old;
end; $$;

drop trigger if exists trg_guard_installment_parent_delete on public.condominium_installments;
create trigger trg_guard_installment_parent_delete before delete on public.condominium_installments
for each row execute function public.guard_installment_parent_delete();

revoke all on function public.guard_ledger_parent_delete() from public;
revoke all on function public.guard_millesimal_table_parent_delete() from public;
revoke all on function public.guard_installment_parent_delete() from public;
grant execute on function public.guard_ledger_parent_delete() to authenticated;
grant execute on function public.guard_millesimal_table_parent_delete() to authenticated;
grant execute on function public.guard_installment_parent_delete() to authenticated;
