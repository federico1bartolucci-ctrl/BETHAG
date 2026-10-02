-- Require every source and destination unit to be active at confirmation time.
create or replace function public.validate_confirmed_unit_transformation_genealogy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_sources integer;
  v_destinations integer;
  v_valid_units integer;
  v_unique_units integer;
  v_active_sources integer;
  v_active_destinations integer;
begin
  if new.status <> 'Confermata' then
    return new;
  end if;

  select
    count(*) filter (where i.direction = 'Fonte')::integer,
    count(*) filter (where i.direction = 'Destinazione')::integer,
    count(*) filter (
      where u.id is not null
        and u.workspace_id = new.workspace_id
        and u.condominium_id = new.condominium_id
    )::integer,
    count(distinct i.unit_id)::integer,
    count(*) filter (
      where i.direction = 'Fonte'
        and u.lifecycle_status = 'Attiva'
        and u.condominium_id = new.condominium_id
        and u.workspace_id = new.workspace_id
    )::integer,
    count(*) filter (
      where i.direction = 'Destinazione'
        and u.lifecycle_status = 'Attiva'
        and u.condominium_id = new.condominium_id
        and u.workspace_id = new.workspace_id
    )::integer
  into v_sources, v_destinations, v_valid_units, v_unique_units,
       v_active_sources, v_active_destinations
  from public.condominium_unit_transformation_items i
  left join public.condominium_units u on u.id = i.unit_id
  where i.transformation_id = new.id;

  if v_sources <> new.source_unit_count
     or v_destinations <> new.destination_unit_count
     or v_valid_units <> v_sources + v_destinations
     or v_unique_units <> v_sources + v_destinations then
    raise exception 'UNIT_TRANSFORMATION_GENEALOGY_MISMATCH: i collegamenti effettivi non corrispondono ai conteggi o al condominio/workspace';
  end if;

  if v_active_sources <> v_sources or v_active_destinations <> v_destinations then
    raise exception 'UNIT_TRANSFORMATION_UNITS_NOT_ACTIVE: tutte le unità di origine e destinazione devono essere attive al momento della conferma';
  end if;

  if new.transformation_type = 'Fusione'
     and (v_sources < 2 or v_destinations <> 1) then
    raise exception 'UNIT_TRANSFORMATION_FUSION_GENEALOGY_INVALID: la fusione richiede almeno due fonti e una destinazione';
  end if;

  if new.transformation_type = 'Frazionamento'
     and (v_sources <> 1 or v_destinations < 2) then
    raise exception 'UNIT_TRANSFORMATION_SPLIT_GENEALOGY_INVALID: il frazionamento richiede una fonte e almeno due destinazioni';
  end if;

  return new;
end;
$function$;
