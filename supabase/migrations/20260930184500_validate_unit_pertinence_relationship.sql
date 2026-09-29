-- Validate that a unit's optional parent/pertinence reference is valid,
-- belongs to the same condominium, and cannot create a cycle.
create or replace function public.validate_condominium_unit_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid;
  v_parent_condominium uuid;
  v_current uuid;
  v_depth integer := 0;
begin
  if nullif(trim(coalesce(new.data->>'incorporatedInUnitId','')), '') is null then
    return new;
  end if;

  begin
    v_parent_id := (new.data->>'incorporatedInUnitId')::uuid;
  exception when invalid_text_representation then
    raise exception 'L''unità di riferimento della pertinenza non è valida.';
  end;

  if v_parent_id = new.id then
    raise exception 'Un''unità non può essere la propria pertinenza.';
  end if;

  select condominium_id into v_parent_condominium
  from public.condominium_units
  where id = v_parent_id;

  if v_parent_condominium is null then
    raise exception 'L''unità principale indicata per la pertinenza non esiste.';
  end if;

  if v_parent_condominium <> new.condominium_id then
    raise exception 'La pertinenza deve appartenere allo stesso condominio dell''unità principale.';
  end if;

  v_current := v_parent_id;
  while v_current is not null and v_depth < 100 loop
    v_depth := v_depth + 1;
    if v_current = new.id then
      raise exception 'Collegamento circolare tra unità immobiliari non consentito.';
    end if;

    select nullif(trim(coalesce(data->>'incorporatedInUnitId','')), '')::uuid
      into v_current
    from public.condominium_units
    where id = v_current;
  end loop;

  if v_depth >= 100 then
    raise exception 'Catena di pertinenze non valida.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_condominium_unit_relationship on public.condominium_units;
create trigger trg_validate_condominium_unit_relationship
after insert or update of condominium_id, data
on public.condominium_units
for each row execute function public.validate_condominium_unit_relationship();

revoke execute on function public.validate_condominium_unit_relationship() from public, anon, authenticated;
