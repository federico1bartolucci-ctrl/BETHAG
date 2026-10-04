-- Keep the redundant unit ownerMemberIds JSON synchronized with the
-- authoritative condominium_members relation when a member is inserted or
-- changes unit, condominium, legacy ID, or role.
-- Forward-only candidate; validate against the effective schema/data before replay.
create or replace function public.sync_unit_owner_refs_after_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_unit_id uuid;
  v_condominium_id uuid;
begin
  -- Reconcile the former unit on reassignment/role change and the current unit.
  if tg_op = 'UPDATE' then
    if old.unit_id is not null and old.condominium_id is not null then
      update public.condominium_units u
      set data = pg_catalog.jsonb_set(
            coalesce(u.data, '{}'::pg_catalog.jsonb),
            '{ownerMemberIds}',
            coalesce((
              select pg_catalog.jsonb_agg(m.legacy_id order by m.legacy_id)
              from public.condominium_members m
              where m.unit_id = u.id
                and m.condominium_id = u.condominium_id
                and m.legacy_id is not null
                and coalesce(m.data->>'role', m.role, '') = 'Proprietario'
            ), '[]'::pg_catalog.jsonb),
            true
          ),
          updated_at = pg_catalog.now()
      where u.id = old.unit_id
        and u.condominium_id = old.condominium_id
        and coalesce(u.data->'ownerMemberIds', '[]'::pg_catalog.jsonb)
            is distinct from coalesce((
              select pg_catalog.jsonb_agg(m.legacy_id order by m.legacy_id)
              from public.condominium_members m
              where m.unit_id = u.id
                and m.condominium_id = u.condominium_id
                and m.legacy_id is not null
                and coalesce(m.data->>'role', m.role, '') = 'Proprietario'
            ), '[]'::pg_catalog.jsonb);
    end if;
  end if;

  if new.unit_id is not null and new.condominium_id is not null then
    update public.condominium_units u
    set data = pg_catalog.jsonb_set(
          coalesce(u.data, '{}'::pg_catalog.jsonb),
          '{ownerMemberIds}',
          coalesce((
            select pg_catalog.jsonb_agg(m.legacy_id order by m.legacy_id)
            from public.condominium_members m
            where m.unit_id = u.id
              and m.condominium_id = u.condominium_id
              and m.legacy_id is not null
              and coalesce(m.data->>'role', m.role, '') = 'Proprietario'
          ), '[]'::pg_catalog.jsonb),
          true
        ),
        updated_at = pg_catalog.now()
    where u.id = new.unit_id
      and u.condominium_id = new.condominium_id
      and coalesce(u.data->'ownerMemberIds', '[]'::pg_catalog.jsonb)
          is distinct from coalesce((
            select pg_catalog.jsonb_agg(m.legacy_id order by m.legacy_id)
            from public.condominium_members m
            where m.unit_id = u.id
              and m.condominium_id = u.condominium_id
              and m.legacy_id is not null
              and coalesce(m.data->>'role', m.role, '') = 'Proprietario'
          ), '[]'::pg_catalog.jsonb);
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_sync_unit_owner_refs_after_member_change
  on public.condominium_members;
create trigger trg_sync_unit_owner_refs_after_member_change
after insert or update of unit_id, condominium_id, legacy_id, role, data
on public.condominium_members
for each row
execute function public.sync_unit_owner_refs_after_member_change();

revoke all on function public.sync_unit_owner_refs_after_member_change()
  from public, anon, authenticated;
