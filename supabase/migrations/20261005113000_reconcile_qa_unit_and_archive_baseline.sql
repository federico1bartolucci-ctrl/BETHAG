-- Reconcile legacy QA baseline with the production unit/archive schema.
alter table public.condominiums
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists archive_reason text;

create table if not exists public.condominium_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  unit_code text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  building_code text not null default '',
  lifecycle_status text not null default 'Attiva',
  lifecycle_effective_date date,
  superseded_at timestamptz,
  constraint condominium_units_lifecycle_status_check
    check (lifecycle_status = any (array['Attiva','Storica','Soppressa']))
);

create index if not exists condominium_units_workspace_idx
  on public.condominium_units(workspace_id);
create index if not exists condominium_units_condominium_idx
  on public.condominium_units(condominium_id);
create index if not exists condominium_units_code_lookup_idx
  on public.condominium_units(condominium_id, unit_code);
create index if not exists condominium_units_building_code_idx
  on public.condominium_units(workspace_id, condominium_id, building_code);
create unique index if not exists condominium_units_code_building_uq
  on public.condominium_units(condominium_id, lower(btrim(building_code)), lower(btrim(unit_code)));
create unique index if not exists condominium_units_unique_unit
  on public.condominium_units(condominium_id, lower(btrim(unit_code)));
create unique index if not exists condominium_units_condominium_unit_code_normalized_uidx
  on public.condominium_units(condominium_id, lower(trim(unit_code)));
