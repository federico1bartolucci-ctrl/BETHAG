create or replace function public.clean_deleted_member_owner_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.legacy_id is not null then
    update public.condominium_units as u
    set data = pg_catalog.jsonb_set(
      coalesce(u.data, '{}'::pg_catalog.jsonb),
      '{ownerMemberIds}',
      coalesce((
        select pg_catalog.jsonb_agg(e.elem order by e.ord)
        from pg_catalog.jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
              then u.data->'ownerMemberIds'
            else '[]'::pg_catalog.jsonb
          end
        ) with ordinality as e(elem, ord)
        where e.elem #>> '{}' <> old.legacy_id::text
      ), '[]'::pg_catalog.jsonb),
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
$function$;

revoke all on function public.clean_deleted_member_owner_references() from public, anon, authenticated, service_role;