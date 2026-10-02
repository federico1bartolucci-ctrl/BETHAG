-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text)
CREATE OR REPLACE FUNCTION public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.delete_condominium($1,$2,$3); end $function$
;

-- public.ensure_table_millesimal_values()
CREATE OR REPLACE FUNCTION public.ensure_table_millesimal_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if NEW.active then
    insert into public.condominium_millesimal_values
      (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
    select NEW.workspace_id, NEW.condominium_id, NEW.id, u.id, 0, false, ''
    from public.condominium_units u
    where u.condominium_id = NEW.condominium_id and u.workspace_id = NEW.workspace_id
    on conflict (workspace_id, table_id, unit_id) do nothing;
  end if;
  return NEW;
end; $function$
;

-- public.ensure_unit_millesimal_values()
CREATE OR REPLACE FUNCTION public.ensure_unit_millesimal_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.condominium_millesimal_values
    (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
  select NEW.workspace_id, NEW.condominium_id, t.id, NEW.id, 0, false, ''
  from public.condominium_millesimal_tables t
  where t.condominium_id = NEW.condominium_id and t.workspace_id = NEW.workspace_id and t.active
  on conflict (workspace_id, table_id, unit_id) do nothing;
  return NEW;
end; $function$
;

-- public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date)
CREATE OR REPLACE FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date DEFAULT NULL::date)
 RETURNS TABLE(unit_id uuid, millesimi numeric, amount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_entry public.condominium_ledger_entries%rowtype;
  v_table public.condominium_millesimal_tables%rowtype;
  v_expense numeric;
  v_due_date date;
  v_total numeric;
  v_unit_count integer;
  v_value_count integer;
  v_installments integer;
  v_other_allocations integer;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_entry
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id
  for update;

  if not found or v_entry.direction<>'Uscita' or coalesce(v_entry.amount,0)<=0 then
    raise exception 'Spesa non valida o non appartenente al condominio';
  end if;

  select * into v_table
  from public.condominium_millesimal_tables
  where id=p_table_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and active=true;

  if not found then raise exception 'Tabella millesimale non valida o non attiva'; end if;

  v_installments := (
    select count(*) from public.condominium_installments
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id
  );
  if v_installments>0 then
    raise exception 'La spesa ha già rate collegate: modifica o elimina prima le rate per poter rigenerare la ripartizione';
  end if;

  v_other_allocations := (
    select count(*) from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
      and allocation_table_id is distinct from p_table_id
  );
  if v_other_allocations>0 then
    raise exception 'La spesa è già ripartita con un''altra tabella: elimina prima il riparto esistente per evitare una doppia imputazione';
  end if;

  v_expense:=round(v_entry.amount::numeric,2);
  v_due_date:=coalesce(p_due_date,v_entry.due_date);

  v_unit_count := (
    select count(*) from public.condominium_units u
    where u.workspace_id=p_workspace_id and u.condominium_id=p_condominium_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_unit_count=0 then raise exception 'Il criterio di riparto non contiene unità eleggibili'; end if;

  v_value_count := (
    select count(*) from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_value_count<>v_unit_count then
    raise exception 'Tabella millesimale incompleta: inserire una quota per ogni unità prevista dal criterio';
  end if;

  v_total := (
    select coalesce(sum(v.value),0)
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_total<=0 then raise exception 'Nessuna quota millesimale eleggibile'; end if;
  if abs(v_total-coalesce(v_table.total_millesimi,0))>0.001 then
    raise exception 'La somma delle quote millesimali del criterio non coincide con il totale della tabella';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id and allocation_table_id=p_table_id;

  return query
  with eligible as (
    select v.unit_id eligible_unit_id,v.value::numeric eligible_millesimi,
           v_expense*v.value::numeric/v_total exact_amount
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id
      and v.table_id=p_table_id and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  ), rounded as (
    select e.*,floor(e.exact_amount*100)/100 base_amount,
           e.exact_amount-floor(e.exact_amount*100)/100 remainder from eligible e
  ), delta as (
    select round(v_expense*100)-round(coalesce(sum(r.base_amount),0)*100) cents from rounded r
  ), ranked as (
    select r.*,row_number() over(order by r.remainder desc,r.eligible_unit_id) rn from rounded r
  ), final_amounts as (
    select r.eligible_unit_id final_unit_id,r.eligible_millesimi final_millesimi,
           r.base_amount+case when r.rn <= greatest((select cents from delta),0) then 0.01 else 0 end final_amount
    from ranked r
  )
  insert into public.condominium_expense_allocations(
    workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,
    allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
  )
  select p_workspace_id,p_condominium_id,p_ledger_entry_id,p_table_id,
         f.final_unit_id,null,v_table.basis_type,f.final_millesimi,f.final_amount,
         0,v_due_date,'Da pagare','Generata automaticamente secondo il criterio configurato'
  from final_amounts f
  returning condominium_expense_allocations.unit_id,
            condominium_expense_allocations.millesimi,
            condominium_expense_allocations.amount;
end;
$function$
;

-- public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text)
CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text)
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

  select count(*), coalesce(sum(w.weight),0)
  into v_count,v_total_weight
  from (
    select r.unit_id,
      sum(
        coalesce(
          nullif(r.charge_amount,0),
          nullif(r.allocation_value,0),
          nullif(r.consumption,0),
          nullif(r.kwh,0),
          0
        )
      ) as weight
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
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
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
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
  ) q;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id;

  for v_row in
    select r.unit_id,u.unit_code,
      sum(
        coalesce(
          nullif(r.charge_amount,0),
          nullif(r.allocation_value,0),
          nullif(r.consumption,0),
          nullif(r.kwh,0),
          0
        )
      ) as weight
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
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
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
$function$
;

-- public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
CREATE OR REPLACE FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_fiscal_year_carryovers($1,$2,$3,$4); end $function$
;

-- public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid)
CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations($1,$2,$3,$4,$5,$6); end $function$
;

-- public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean)
CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[] DEFAULT NULL::numeric[], p_unify_by_member boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations_schedule($1,$2,$3,$4,$5,$6,$7,$8); end $function$
;
