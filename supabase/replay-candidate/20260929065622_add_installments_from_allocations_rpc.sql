create or replace function public.generate_installments_from_allocations(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_ledger_entry_id uuid,
  p_title text,
  p_due_date date,
  p_fiscal_year_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.condominium_ledger_entries
    where id=p_ledger_entry_id and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id and direction='Uscita'
  ) then
    raise exception 'Spesa non valida';
  end if;

  insert into public.condominium_installments(
    workspace_id, condominium_id, fiscal_year_id, unit_id,
    title, due_date, amount, paid_amount, status, notes
  )
  select p_workspace_id, p_condominium_id, p_fiscal_year_id, a.unit_id,
         p_title || ' · ' || coalesce(u.unit_code,'Unità'),
         p_due_date, round(a.amount,2), 0, 'Da pagare',
         'Generata dalla ripartizione della spesa'
  from public.condominium_expense_allocations a
  left join public.condominium_units u on u.id=a.unit_id
  where a.workspace_id=p_workspace_id
    and a.condominium_id=p_condominium_id
    and a.ledger_entry_id=p_ledger_entry_id
    and a.amount > 0
    and not exists (
      select 1 from public.condominium_installments i
      where i.workspace_id=p_workspace_id
        and i.condominium_id=p_condominium_id
        and i.unit_id=a.unit_id
        and i.title=p_title || ' · ' || coalesce(u.unit_code,'Unità')
        and i.amount=round(a.amount,2)
        and coalesce(i.due_date,date '1900-01-01')=coalesce(p_due_date,date '1900-01-01')
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid) from public;
grant execute on function public.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid) to authenticated;