-- Preserve the member identity attached to accounting history.
-- Members with financial records must be archived, not hard-deleted.
create or replace function public.prevent_delete_member_with_financial_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1 from public.condominium_installments i
    where i.member_id = old.id
  ) or exists (
    select 1 from public.condominium_expense_allocations a
    where a.member_id = old.id
  ) or exists (
    select 1 from public.condominium_fiscal_carryovers c
    where c.member_id = old.id
  ) or exists (
    select 1 from public.condominium_ledger_entries l
    where l.member_id = old.id
  ) then
    raise exception using
      errcode = '23503',
      message = 'MEMBER_FINANCIAL_HISTORY_REQUIRES_ARCHIVING',
      detail = 'Il profilo è collegato a registrazioni contabili: archiviarlo invece di eliminarlo.';
  end if;

  return old;
end;
$function$;

drop trigger if exists trg_prevent_delete_member_with_financial_history
  on public.condominium_members;

create trigger trg_prevent_delete_member_with_financial_history
before delete on public.condominium_members
for each row
execute function public.prevent_delete_member_with_financial_history();

revoke execute on function public.prevent_delete_member_with_financial_history()
  from public, anon, authenticated;
