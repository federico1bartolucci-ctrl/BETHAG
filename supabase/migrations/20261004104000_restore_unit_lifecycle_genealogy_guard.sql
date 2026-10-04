-- Restore production's cadastral lifecycle guard in the forward migration history.
-- The transformation tables and lifecycle columns are introduced by
-- 20261001095000_add_unit_cadastral_transformations.sql.
create or replace function public.require_confirmed_genealogy_for_unit_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.lifecycle_status is not distinct from old.lifecycle_status
     and new.lifecycle_effective_date is not distinct from old.lifecycle_effective_date then
    return new;
  end if;

  if current_user = 'postgres' then
    return new;
  end if;

  if new.lifecycle_status = 'Attiva' then
    raise exception 'UNIT_LIFECYCLE_REACTIVATION_REQUIRES_TRUSTED_RPC: la riattivazione deve essere gestita da una procedura autorizzata';
  end if;

  if old.lifecycle_status <> 'Attiva'
     or new.lifecycle_status not in ('Storica','Soppressa') then
    raise exception 'UNIT_LIFECYCLE_TRANSITION_INVALID: transizione dello stato catastale non consentita';
  end if;

  if new.lifecycle_effective_date is null or not exists (
    select 1
    from public.condominium_unit_transformation_items i
    join public.condominium_unit_transformations t on t.id = i.transformation_id
    where i.unit_id = old.id
      and i.direction = 'Fonte'
      and t.condominium_id = old.condominium_id
      and t.workspace_id = old.workspace_id
      and t.status = 'Confermata'
      and t.effective_date = new.lifecycle_effective_date
  ) then
    raise exception 'UNIT_LIFECYCLE_REQUIRES_CONFIRMED_GENEALOGY: unità storicizzabile o sopprimibile solo tramite trasformazione catastale confermata con data coincidente';
  end if;

  return new;
end;
$function$;

revoke all on function public.require_confirmed_genealogy_for_unit_lifecycle() from public, anon, authenticated;

drop trigger if exists require_confirmed_genealogy_for_unit_lifecycle_trg
on public.condominium_units;

create trigger require_confirmed_genealogy_for_unit_lifecycle_trg
before update of lifecycle_status, lifecycle_effective_date
on public.condominium_units
for each row
execute function public.require_confirmed_genealogy_for_unit_lifecycle();
