-- BETHAG: indexes for transformation audit foreign keys
create index if not exists idx_unit_transformations_created_by
  on public.condominium_unit_transformations(created_by);
create index if not exists idx_unit_transformations_confirmed_by
  on public.condominium_unit_transformations(confirmed_by);
