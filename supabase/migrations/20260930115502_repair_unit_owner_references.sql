-- Repair redundant unit owner references from the authoritative member relation.
update public.condominium_units u
set data = jsonb_set(
  coalesce(u.data,'{}'::jsonb),
  '{ownerMemberIds}',
  coalesce((
    select jsonb_agg(m.legacy_id order by m.legacy_id)
    from public.condominium_members m
    where m.unit_id=u.id
      and m.condominium_id=u.condominium_id
      and m.legacy_id is not null
      and coalesce(m.data->>'role','')='Proprietario'
  ), '[]'::jsonb),
  true
),
updated_at=now()
where exists (
  select 1
  from public.condominium_members m
  where m.unit_id=u.id
    and m.condominium_id=u.condominium_id
    and m.legacy_id is not null
    and coalesce(m.data->>'role','')='Proprietario'
);