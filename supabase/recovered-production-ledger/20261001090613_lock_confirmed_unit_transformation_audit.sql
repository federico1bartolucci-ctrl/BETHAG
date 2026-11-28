create or replace function public.guard_confirmed_unit_transformation_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if old.status = 'Confermata' then
    raise exception 'CONFIRMED_TRANSFORMATION_IMMUTABLE: una trasformazione confermata è immodificabile';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

drop trigger if exists trg_guard_confirmed_unit_transformation_immutable
on public.condominium_unit_transformations;
create trigger trg_guard_confirmed_unit_transformation_immutable
before update or delete on public.condominium_unit_transformations
for each row execute function public.guard_confirmed_unit_transformation_immutable();

create or replace function public.guard_confirmed_unit_transformation_items_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_transformation_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_transformation_id := old.transformation_id;
    if exists (
      select 1 from public.condominium_unit_transformations t
      where t.id = v_transformation_id and t.status = 'Confermata'
    ) then
      raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    v_transformation_id := new.transformation_id;
    if exists (
      select 1 from public.condominium_unit_transformations t
      where t.id = v_transformation_id and t.status = 'Confermata'
    ) then
      raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

drop trigger if exists trg_guard_confirmed_unit_transformation_items_immutable
on public.condominium_unit_transformation_items;
create trigger trg_guard_confirmed_unit_transformation_items_immutable
before insert or update or delete on public.condominium_unit_transformation_items
for each row execute function public.guard_confirmed_unit_transformation_items_immutable();