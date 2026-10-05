-- Reconcile QA with the production millesimal table/value schema.
create table if not exists public.condominium_millesimal_tables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  name text not null,
  description text not null default '',
  total_millesimi numeric not null default 1000,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  basis_type text not null default 'Millesimi',
  scope_mode text not null default 'all',
  scope_unit_ids uuid[] not null default '{}'::uuid[],
  scope_building_codes text[] not null default '{}'::text[],
  constraint condominium_millesimal_tables_basis_type_check check (basis_type = any (array['Millesimi','Quote personalizzate','Consumo','Misto'])),
  constraint condominium_millesimal_tables_scope_mode_check check (scope_mode = any (array['all','units','buildings'])),
  constraint condominium_millesimal_tables_total_positive check (total_millesimi > 0)
);

create table if not exists public.condominium_millesimal_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  table_id uuid not null references public.condominium_millesimal_tables(id) on delete cascade,
  unit_id uuid not null references public.condominium_units(id) on delete cascade,
  value numeric not null default 0,
  excluded boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_millesimal_values_table_id_unit_id_key unique(table_id,unit_id),
  constraint condominium_millesimal_values_value_nonnegative check (value >= 0)
);
