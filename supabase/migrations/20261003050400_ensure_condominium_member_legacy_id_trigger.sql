-- Ensure fresh migration replays assign a stable legacy_id to each condominium member.
-- Production already has this trigger, but the repository migration chain must
-- recreate it explicitly so transfer inserts do not depend on out-of-band DDL.
create or replace function public.assign_condominium_member_legacy_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.legacy_id is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.condominium_id::text, 0)
    );

    select coalesce(max(m.legacy_id), 0) + 1
      into new.legacy_id
      from public.condominium_members m
      where m.condominium_id = new.condominium_id;
  end if;

  return new;
end;
$function$;

alter function public.assign_condominium_member_legacy_id()
  set search_path = '';

revoke all on function public.assign_condominium_member_legacy_id()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_assign_condominium_member_legacy_id
  on public.condominium_members;

create trigger trg_assign_condominium_member_legacy_id
before insert on public.condominium_members
for each row
execute function public.assign_condominium_member_legacy_id();
