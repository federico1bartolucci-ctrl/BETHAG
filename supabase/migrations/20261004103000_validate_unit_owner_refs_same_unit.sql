-- Validate denormalized owner references against the authoritative member-unit relation.
-- Forward-only correction; preserves valid empty owner arrays and co-ownership.
create or replace function public.validate_unit_owner_member_refs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_owner text;
  v_member_count integer;
  v_ref_count integer;
begin
  if jsonb_typeof(coalesce(new.data->'ownerMemberIds','[]'::jsonb)) <> 'array' then
    raise exception 'OWNER_REFS_INVALID: ownerMemberIds deve essere un array';
  end if;

  for v_owner in
    select value
    from jsonb_array_elements_text(coalesce(new.data->'ownerMemberIds','[]'::jsonb))
  loop
    select count(*) into v_ref_count
    from jsonb_array_elements_text(coalesce(new.data->'ownerMemberIds','[]'::jsonb)) as refs(value)
    where refs.value = v_owner;

    if v_ref_count <> 1 then
      raise exception 'OWNER_REF_DUPLICATE: il riferimento proprietario % è duplicato', v_owner;
    end if;

    select count(*) into v_member_count
    from public.condominium_members m
    where m.condominium_id = new.condominium_id
      and m.unit_id = new.id
      and m.legacy_id::text = v_owner
      and coalesce(m.data->>'role','') = 'Proprietario';

    if v_member_count <> 1 then
      raise exception 'OWNER_REF_INVALID: il proprietario % non è associato a questa unità o non è qualificato come Proprietario', v_owner;
    end if;
  end loop;

  return new;
end;
$function$;

drop trigger if exists trg_validate_unit_owner_member_refs on public.condominium_units;
create constraint trigger trg_validate_unit_owner_member_refs
after insert or update of condominium_id, data on public.condominium_units
deferrable initially deferred
for each row execute function public.validate_unit_owner_member_refs();

revoke all on function public.validate_unit_owner_member_refs() from public, anon, authenticated;
