create or replace function public.prevent_member_delete_with_financial_history()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if exists (select 1 from public.condominium_installments i where i.member_id=old.id)
     or exists (select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
     or exists (select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id)
  then
    raise exception 'MEMBER_FINANCIAL_HISTORY_LOCK: non è possibile eliminare un membro con storico contabile; disattivare la posizione o creare una nuova posizione anagrafica';
  end if;
  return old;
end;
$$;

revoke execute on function public.prevent_member_delete_with_financial_history() from anon, public;

drop trigger if exists trg_prevent_member_delete_with_financial_history on public.condominium_members;

create trigger trg_prevent_member_delete_with_financial_history
before delete on public.condominium_members
for each row
execute function public.prevent_member_delete_with_financial_history();
