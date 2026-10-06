begin;

create or replace function public.clean_deleted_member_owner_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.legacy_id is not null then
    update public.condominium_units as u
    set data = jsonb_set(
      coalesce(u.data, '{}'::jsonb),
      '{ownerMemberIds}',
      coalesce((
        select jsonb_agg(e.elem order by e.ord)
        from jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
            then u.data->'ownerMemberIds'
            else '[]'::jsonb
          end
        ) with ordinality as e(elem, ord)
        where e.elem #>> '{}' <> old.legacy_id::text
      ), '[]'::jsonb),
      true
    ),
    updated_at = pg_catalog.now()
    from public.condominiums as c
    where c.id = u.condominium_id
      and c.id = old.condominium_id
      and u.workspace_id = c.workspace_id
      and pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
      and exists (
        select 1
        from pg_catalog.jsonb_array_elements(u.data->'ownerMemberIds') as e(elem)
        where e.elem #>> '{}' = old.legacy_id::text
      );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_clean_deleted_member_owner_references
  on public.condominium_members;

create trigger trg_clean_deleted_member_owner_references
after delete on public.condominium_members
for each row execute function public.clean_deleted_member_owner_references();

revoke execute on function public.clean_deleted_member_owner_references()
from public, anon, authenticated;

commit;
