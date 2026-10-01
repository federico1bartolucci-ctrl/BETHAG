-- Protect historical condominium member attribution from unit/condominium reassignment.
-- Ownership transfers must create a new member position and leave the historical position intact.

create or replace function public.prevent_member_unit_reassignment_with_financial_history()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.unit_id is distinct from old.unit_id
     and exists (
       select 1
       from public.condominium_installments i
       where i.member_id = old.id
     )
  then
    raise exception 'MEMBER_UNIT_HISTORY_LOCK: non è possibile riassegnare l''unità di un membro con rate storiche; creare una nuova posizione anagrafica per il nuovo intestatario';
  end if;

  if new.condominium_id is distinct from old.condominium_id
     and exists (
       select 1
       from public.condominium_installments i
       where i.member_id = old.id
     )
  then
    raise exception 'MEMBER_CONDOMINIUM_HISTORY_LOCK: non è possibile spostare un membro con storico contabile in un altro condominio';
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_member_unit_reassignment_with_financial_history() from anon, public;

drop trigger if exists trg_prevent_member_unit_reassignment_with_financial_history
on public.condominium_members;

create trigger trg_prevent_member_unit_reassignment_with_financial_history
before update on public.condominium_members
for each row
execute function public.prevent_member_unit_reassignment_with_financial_history();
