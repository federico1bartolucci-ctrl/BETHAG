create or replace function public.generate_condominium_expense_allocations(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_ledger_entry_id uuid,
  p_table_id uuid,
  p_due_date date default null
)
returns table(unit_id uuid, millesimi numeric, amount numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expense numeric;
  v_due_date date;
  v_total numeric;
  v_sum numeric;
begin
  select amount, coalesce(p_due_date, due_date)
    into v_expense, v_due_date
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and direction='Uscita';

  if v_expense is null or v_expense <= 0 then
    raise exception 'Spesa non valida o non appartenente al condominio';
  end if;

  if not exists (
    select 1 from public.condominium_millesimal_tables
    where id=p_table_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and active=true
  ) then
    raise exception 'Tabella millesimale non valida o non attiva';
  end if;

  select coalesce(sum(v.value),0)
    into v_total
  from public.condominium_millesimal_values v
  join public.condominium_units u on u.id=v.unit_id
  where v.workspace_id=p_workspace_id
    and v.condominium_id=p_condominium_id
    and v.table_id=p_table_id
    and v.excluded=false
    and v.value>0
    and u.workspace_id=p_workspace_id
    and u.condominium_id=p_condominium_id;

  if v_total <= 0 then
    raise exception 'Nessuna quota millesimale eleggibile';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id
    and allocation_table_id=p_table_id;

  return query
  with eligible as (
    select v.unit_id, v.value as millesimi,
           (v_expense * v.value / v_total) as exact_amount
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id
      and v.condominium_id=p_condominium_id
      and v.table_id=p_table_id
      and v.excluded=false
      and v.value>0
      and u.workspace_id=p_workspace_id
      and u.condominium_id=p_condominium_id
  ),
  rounded as (
    select *, floor(exact_amount*100)/100 as base_amount,
           exact_amount - floor(exact_amount*100)/100 as remainder
    from eligible
  ),
  delta as (
    select round(v_expense*100) - round(sum(base_amount)*100) as cents
    from rounded
  ),
  ranked as (
    select r.*, row_number() over(order by remainder desc, unit_id) as rn
    from rounded r
  ),
  final_amounts as (
    select ranked.unit_id, ranked.millesimi,
      ranked.base_amount + case when ranked.rn <= (select cents from delta) then 0.01 else 0 end as amount
    from ranked
  )
  insert into public.condominium_expense_allocations(
    workspace_id, condominium_id, ledger_entry_id, allocation_table_id,
    unit_id, member_id, allocation_basis, millesimi, amount, paid_amount,
    due_date, status, notes
  )
  select p_workspace_id, p_condominium_id, p_ledger_entry_id, p_table_id,
         f.unit_id, null, 'Millesimi: ' || p_table_id::text, f.millesimi,
         f.amount, 0, v_due_date, 'Da pagare', 'Generata automaticamente'
  from final_amounts f
  returning unit_id, millesimi, amount;
end;
$$;

revoke all on function public.generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) from public;
grant execute on function public.generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date) to authenticated;