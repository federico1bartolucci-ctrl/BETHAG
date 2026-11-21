-- Prevent consumption-allocation generation from deleting manual allocations.
-- Existing generated consumption rows may be replaced; unrelated allocation rows must not be.
CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_ledger_entry_id uuid,
  p_fiscal_year_id uuid,
  p_service_type text
)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_expense public.condominium_ledger_entries%rowtype;
  v_total_weight numeric;
  v_total_cents bigint;
  v_used_cents bigint := 0;
  v_alloc_cents bigint;
  v_idx integer := 0;
  v_count integer;
  v_rows integer;
  v_row record;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if trim(coalesce(p_service_type,''))='' then
    raise exception 'Servizio di consumo obbligatorio';
  end if;

  select * into v_expense
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Spesa non trovata';
  end if;

  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then
    raise exception 'Il movimento selezionato non è una spesa valida';
  end if;

  if exists(
    select 1 from public.condominium_fiscal_years
    where id=p_fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and status='Chiuso'
  ) then
    raise exception 'L''esercizio contabile è chiuso';
  end if;

  if not exists(
    select 1 from public.condominium_fiscal_years
    where id=p_fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
  ) then
    raise exception 'Esercizio contabile non valido';
  end if;

  if exists(
    select 1 from public.condominium_installments
    where workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
  ) then
    raise exception 'La spesa ha già rate collegate';
  end if;

  -- Critical guard: this routine replaces allocation rows. Do not silently
  -- remove manually entered or otherwise non-consumption allocations.
  if exists(
    select 1 from public.condominium_expense_allocations
    where workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
      and allocation_basis is distinct from ('Consumo - '||trim(p_service_type))
  ) then
    raise exception 'La spesa contiene ripartizioni non basate sui consumi: non possono essere sostituite automaticamente';
  end if;

  select count(*), coalesce(sum(w.weight),0)
  into v_count,v_total_weight
  from (
    select r.unit_id,
      sum(coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id
    having sum(coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)) > 0
  ) w;

  if v_count=0 then
    raise exception 'Nessun dato di consumo disponibile per il servizio selezionato';
  end if;

  if v_total_weight<=0 then
    raise exception 'I dati di consumo non contengono un valore utile al riparto';
  end if;

  v_total_cents:=round(v_expense.amount*100);

  select count(*) into v_rows
  from (
    select r.unit_id
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id
    having sum(coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)) > 0
  ) q;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id;

  for v_row in
    select r.unit_id,u.unit_code,
      sum(coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id,u.unit_code
    having sum(coalesce(nullif(r.charge_amount,0),nullif(r.allocation_value,0),nullif(r.consumption,0),nullif(r.kwh,0),0)) > 0
    order by u.unit_code
  loop
    v_idx:=v_idx+1;

    if v_idx=v_rows then
      v_alloc_cents:=v_total_cents-v_used_cents;
    else
      v_alloc_cents:=floor(v_total_cents*v_row.weight/v_total_weight);
    end if;

    if v_alloc_cents<0 then
      raise exception 'Importo di riparto non valido';
    end if;

    v_used_cents:=v_used_cents+v_alloc_cents;

    insert into public.condominium_expense_allocations(
      workspace_id,condominium_id,ledger_entry_id,unit_id,
      allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
    )
    values(
      p_workspace_id,p_condominium_id,p_ledger_entry_id,v_row.unit_id,
      'Consumo - '||trim(p_service_type),v_row.weight,
      v_alloc_cents/100.0,0,v_expense.due_date,'Da pagare',
      'Riparto generato dai dati di consumo inseriti/importati in BETHAG; letture aggregate per unità.'
    );
  end loop;

  return v_rows;
end;
$function$;
