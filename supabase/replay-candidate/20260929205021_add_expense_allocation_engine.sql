
create or replace function public.allocate_condominium_expense(
  p_ledger_entry_id uuid,
  p_table_id uuid,
  p_due_date date default null,
  p_replace_existing boolean default false
)
returns table (
  allocation_id uuid,
  unit_id uuid,
  millesimi numeric,
  amount numeric
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry public.condominium_ledger_entries%rowtype;
  v_table public.condominium_millesimal_tables%rowtype;
  v_sum numeric;
  v_count integer;
  v_total numeric;
  v_running numeric := 0;
  v_last_unit uuid;
  r record;
  v_amount numeric;
begin
  select *
    into v_entry
  from public.condominium_ledger_entries
  where id = p_ledger_entry_id;

  if not found then
    raise exception 'Movimento contabile non trovato';
  end if;

  if lower(coalesce(v_entry.direction,'')) not in ('uscita','expense','spesa') then
    raise exception 'Il movimento selezionato non è una spesa';
  end if;

  if v_entry.amount is null or v_entry.amount <= 0 then
    raise exception 'L''importo della spesa deve essere maggiore di zero';
  end if;

  select *
    into v_table
  from public.condominium_millesimal_tables
  where id = p_table_id
    and condominium_id = v_entry.condominium_id
    and workspace_id = v_entry.workspace_id
    and active = true;

  if not found then
    raise exception 'Tabella millesimale non trovata, inattiva o non appartenente al condominio';
  end if;

  select
    coalesce(sum(value) filter (where not excluded and value > 0), 0),
    count(*) filter (where not excluded and value > 0)
  into v_sum, v_count
  from public.condominium_millesimal_values
  where table_id = p_table_id
    and condominium_id = v_entry.condominium_id
    and workspace_id = v_entry.workspace_id;

  if v_count = 0 or v_sum <= 0 then
    raise exception 'La tabella millesimale non contiene valori utilizzabili';
  end if;

  if exists (
    select 1
    from public.condominium_expense_allocations
    where ledger_entry_id = p_ledger_entry_id
      and allocation_table_id = p_table_id
  ) then
    if not p_replace_existing then
      raise exception 'Esiste già una ripartizione per questa spesa e questa tabella. Usare p_replace_existing=true per ricalcolarla';
    end if;

    delete from public.condominium_expense_allocations
    where ledger_entry_id = p_ledger_entry_id
      and allocation_table_id = p_table_id;
  end if;

  v_total := round(v_entry.amount::numeric, 2);

  for r in
    select unit_id, value::numeric as millesimi
    from public.condominium_millesimal_values
    where table_id = p_table_id
      and condominium_id = v_entry.condominium_id
      and workspace_id = v_entry.workspace_id
      and excluded = false
      and value > 0
    order by value desc, unit_id
  loop
    v_last_unit := r.unit_id;

    v_amount := round((v_total * r.millesimi / v_sum), 2);

    insert into public.condominium_expense_allocations (
      workspace_id,
      condominium_id,
      ledger_entry_id,
      unit_id,
      member_id,
      allocation_basis,
      millesimi,
      amount,
      paid_amount,
      due_date,
      status,
      notes,
      allocation_table_id
    )
    values (
      v_entry.workspace_id,
      v_entry.condominium_id,
      v_entry.id,
      r.unit_id,
      null,
      'Millesimi',
      r.millesimi,
      v_amount,
      0,
      coalesce(p_due_date, v_entry.due_date),
      case when v_amount = 0 then 'Pagata' else 'Da pagare' end,
      'Ripartizione automatica secondo tabella millesimale',
      p_table_id
    )
    returning id into allocation_id;

    v_running := v_running + v_amount;
    unit_id := r.unit_id;
    millesimi := r.millesimi;
    amount := v_amount;
    return next;
  end loop;

  -- Correzione dei centesimi sull'ultima unità per garantire che
  -- la somma delle quote coincida esattamente con l'importo della spesa.
  if v_last_unit is not null and round(v_running,2) <> v_total then
    update public.condominium_expense_allocations a
    set amount = round(a.amount + (v_total - v_running), 2),
        updated_at = now()
    where a.ledger_entry_id = p_ledger_entry_id
      and a.allocation_table_id = p_table_id
      and a.unit_id = v_last_unit;

    select a.id, a.unit_id, a.millesimi, a.amount
      into allocation_id, unit_id, millesimi, amount
    from public.condominium_expense_allocations a
    where a.ledger_entry_id = p_ledger_entry_id
      and a.allocation_table_id = p_table_id
      and a.unit_id = v_last_unit;

    return next;
  end if;

  return;
end;
$$;

grant execute on function public.allocate_condominium_expense(uuid, uuid, date, boolean)
to authenticated;
