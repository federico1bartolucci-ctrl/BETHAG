alter table public.condominium_unit_transformations
  add constraint condominium_unit_transformations_confirmed_integrity_chk
  check (
    status <> 'Confermata'
    or (
      confirmed_by is not null
      and confirmed_at is not null
      and source_unit_count > 0
      and destination_unit_count > 0
      and (
        (transformation_type = 'Fusione' and source_unit_count >= 2 and destination_unit_count = 1)
        or
        (transformation_type = 'Frazionamento' and source_unit_count = 1 and destination_unit_count >= 2)
      )
    )
  );

comment on constraint condominium_unit_transformations_confirmed_integrity_chk
on public.condominium_unit_transformations is
'Requires confirmed transformations to have confirmer, timestamp, and source/destination counts consistent with merge or split cardinality.';