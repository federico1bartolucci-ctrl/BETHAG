-- Ensure the member-delete financial-history guard sees rows even when RLS
-- policies hide ledger-related records from the deleting administrator.
-- The function is trigger-only and performs read-only existence checks.
create or replace function public.prevent_member_delete_with_financial_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from public.condominium_installments i
    where i.member_id = old.id
  )
  or exists (
    select 1
    from public.condominium_expense_allocations a
    where a.member_id = old.id
  )
  or exists (
    select 1
    from public.condominium_fiscal_carryovers c
    where c.member_id = old.id
  ) then
    raise exception 'MEMBER_FINANCIAL_HISTORY_LOCK: non è possibile eliminare un membro con storico contabile; disattivare la posizione o creare una nuova posizione anagrafica';
  end if;

  return old;
end;
$function$;

revoke all on function public.prevent_member_delete_with_financial_history() from public, anon, authenticated;
