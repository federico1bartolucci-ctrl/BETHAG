-- BETHAG: snapshots for accounting and millesimal review
alter table public.condominium_unit_transformations
  add column if not exists millesimal_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists accounting_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists source_unit_count integer not null default 0,
  add column if not exists destination_unit_count integer not null default 0;
