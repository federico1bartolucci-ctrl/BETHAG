-- BETHAG: completa il patrimonio delle unità immobiliari.
-- Le unità dichiarate nel condominio devono esistere anche senza condòmini associati.
-- La migrazione non elimina mai unità o associazioni esistenti.

with inferred as (
  select
    c.id,
    case
      when nullif(trim(c.data->>'units'), '') ~ '^[0-9]+$'
        then greatest((c.data->>'units')::integer, 0)
      else coalesce(max(nullif(regexp_replace(u.unit_code, '[^0-9]', '', 'g'), '')::integer), 0)
    end as unit_count
  from public.condominiums c
  left join public.condominium_units u on u.condominium_id = c.id
  group by c.id, c.data
)
update public.condominiums c
set data = jsonb_set(coalesce(c.data, '{}'::jsonb), '{units}', to_jsonb(inferred.unit_count), true),
    updated_at = now()
from inferred
where c.id = inferred.id
  and (
    nullif(trim(c.data->>'units'), '') is null
    or (c.data->>'units') !~ '^[0-9]+$'
  )
  and inferred.unit_count > 0;

update public.condominium_units legacy
set unit_code = regexp_replace(legacy.unit_code, '^Interno[[:space:]]+', ''),
    data = jsonb_set(coalesce(legacy.data, '{}'::jsonb), '{unitCode}',
                     to_jsonb(regexp_replace(legacy.unit_code, '^Interno[[:space:]]+', '')), true)
where legacy.unit_code ~* '^Interno[[:space:]]+[0-9]+$'
  and not exists (
    select 1
    from public.condominium_units canonical
    where canonical.condominium_id = legacy.condominium_id
      and canonical.unit_code = regexp_replace(legacy.unit_code, '^Interno[[:space:]]+', '')
      and canonical.id <> legacy.id
  );

insert into public.condominium_units (
  workspace_id,
  condominium_id,
  unit_code,
  data
)
select
  c.workspace_id,
  c.id,
  gs::text,
  jsonb_build_object(
    'unitCode', gs::text,
    'unitType', 'Abitazione',
    'cadastralCategory', '',
    'cadastralAutonomous', true,
    'millesimi', '',
    'incorporatedInUnitId', null,
    'relationshipToResidentialUnit', 'Nessuna',
    'ownerMode', 'condominium_member',
    'ownerMemberIds', '[]'::jsonb,
    'externalOwners', '[]'::jsonb,
    'notes', '',
    'active', true
  )
from public.condominiums c
cross join lateral generate_series(
  1,
  case
    when nullif(trim(c.data->>'units'), '') ~ '^[0-9]+$'
      then (c.data->>'units')::integer
    else 0
  end
) gs
where not exists (
  select 1
  from public.condominium_units u
  where u.condominium_id = c.id
    and lower(trim(u.unit_code)) = lower(trim(gs::text))
);

create index if not exists condominium_units_code_lookup_idx
  on public.condominium_units(condominium_id, unit_code);
