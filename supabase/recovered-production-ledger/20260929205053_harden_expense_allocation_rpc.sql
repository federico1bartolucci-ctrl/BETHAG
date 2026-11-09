
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
  v_entry public.condominium_ledger_entries%rowtype;
  v_table public.condominium_millesimal_tables%rowtype;
  v_expense numeric;
  v_due_date date;
  v_total numeric;
begin
  select *
    into v_entry
  from public.condominium_ledger_entries
  where id = p_ledger_entry_id
    and workspace_id = p_workspace_id
    and condominium_id = p_condominium_id;

  if not found or v_entry.direction <> 'Uscita' or coalesce(v_entry.amount,0) <= 0 then
    raise exception 'Spesa non valida o non appartenente al condominio';
  end if;

  select *
    into v_table
  from public.condominium_millesimal_tables
  where id = p_table_id
    and workspace_id = p_workspace_id
    and condominium_id = p_condominium_id
    and active = true;

  if not found then
    raise exception 'Tabella millesimale non valida o non attiva';
  end if;

  v_expense := round(v_entry.amount::numeric, 2);
  v_due_date := coalesce(p_due_date, v_entry.due_date);

  select coalesce(sum(v.value),0)
    into v_total
  from public.condominium_millesimal_values v
  join public.condominium_units u
    on u.id = v.unit_id
   and u.workspace_id = p_workspace_id
   and u.condominium_id = p_condominium_id
  where v.workspace_id = p_workspace_id
    and v.condominium_id = p_condominium_id
    and v.table_id = p_table_id
    and v.excluded = false
    and v.value > 0;

  if v_total <= 0 then
    raise exception 'Nessuna quota millesimale eleggibile';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id = p_workspace_id
    and condominium_id = p_condominium_id
    and ledger_entry_id = p_ledger_entry_id
    and allocation_table_id = p_table_id;

  return query
  with eligible as (
    select v.unit_id,
           v.value::numeric as millesimi,
           (v_expense * v.value::numeric / v_total) as exact_amount
    from public.condominium_millesimal_values v
    join public.condominium_units u
      on u.id = v.unit_id
     and u.workspace_id = p_workspace_id
     and u.condominium_id = p_condominium_id
    where v.workspace_id = p_workspace_id
      and v.condominium_id = p_condominium_id
      and v.table_id = p_table_id
      and v.excluded = false
      and v.value > 0
  ),
  rounded as (
    select *,
           floor(exact_amount * 100) / 100 as base_amount,
           exact_amount - floor(exact_amount * 100) / 100 as remainder
    from eligible
  ),
  delta as (
    select round(v_expense * 100) - round(coalesce(sum(base_amount),0) * 100) as cents
    from rounded
  ),
  ranked as (
    select r.*,
           row_number() over(order by remainder desc, unit_id) as rn
    from rounded r
  ),
  final_amounts as (
    select unit_id,
           millesimi,
           base_amount + case
             when rn <= (select greatest(cents,0) from delta) then 0.01
             else 0
           end as amount
    from ranked
  )
  insert into public.condominium_expense_allocations (
    workspace_id,
    condominium_id,
    ledger_entry_id,
    allocation_table_id,
    unit_id,
    member_id,
    allocation_basis,
    millesimi,
    amount,
    paid_amount,
    due_date,
    status,
    notes
  )
  select
    p_workspace_id,
    p_condominium_id,
    p_ledger_entry_id,
    p_table_id,
    f.unit_id,
    null,
    'Millesimi',
    f.millesimi,
    f.amount,
    0,
    v_due_date,
    'Da pagare',
    'Generata automaticamente secondo la tabella millesimale'
  from final_amounts f
  returning
    condominium_expense_allocations.unit_id,
    condominium_expense_allocations.millesimi,
    condominium_expense_allocations.amount;
end;
$$;

grant execute on function public.generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date)
to authenticated;

revoke execute on function public.generate_condominium_expense_allocations(uuid,uuid,uuid,uuid,date)
from anon;

drop function if exists public.allocate_condominium_expense(uuid, uuid, date, boolean);
