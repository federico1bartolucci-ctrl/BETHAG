create table if not exists public.condominium_creation_intakes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status text not null default 'Bozza' check (status in ('Bozza','Da verificare','Confermato','Annullato')),
  source text not null default 'AI' check (source in ('AI','Importazione','Manuale')),
  source_documents jsonb not null default '[]'::jsonb,
  extracted_data jsonb not null default '{}'::jsonb,
  structure jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_by uuid references auth.users(id),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_creation_intakes_source_documents_array check (jsonb_typeof(source_documents) = 'array'),
  constraint condominium_creation_intakes_extracted_object check (jsonb_typeof(extracted_data) = 'object'),
  constraint condominium_creation_intakes_structure_object check (jsonb_typeof(structure) = 'object'),
  constraint condominium_creation_intakes_validation_array check (jsonb_typeof(validation_errors) = 'array'),
  constraint condominium_creation_intakes_warnings_array check (jsonb_typeof(warnings) = 'array')
);

create index if not exists idx_condominium_creation_intakes_workspace
  on public.condominium_creation_intakes(workspace_id, created_at desc);

create index if not exists idx_condominium_creation_intakes_status
  on public.condominium_creation_intakes(workspace_id, status);

alter table public.condominium_creation_intakes enable row level security;

drop policy if exists "authorized users read condominium creation intakes" on public.condominium_creation_intakes;
create policy "authorized users read condominium creation intakes"
  on public.condominium_creation_intakes
  for select to authenticated
  using (private.can_access_workspace_module(workspace_id, 'condomini'));

drop policy if exists "managers manage condominium creation intakes" on public.condominium_creation_intakes;
create policy "managers manage condominium creation intakes"
  on public.condominium_creation_intakes
  for all to authenticated
  using (private.can_manage_workspace_module(workspace_id, 'condomini'))
  with check (private.can_manage_workspace_module(workspace_id, 'condomini'));

revoke all on public.condominium_creation_intakes from anon;
grant select, insert, update, delete on public.condominium_creation_intakes to authenticated;