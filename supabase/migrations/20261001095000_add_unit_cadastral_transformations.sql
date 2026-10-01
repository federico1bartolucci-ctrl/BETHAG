-- BETHAG: cadastral fusion/fractionation of condominium units
create table if not exists public.condominium_unit_transformations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  condominium_id uuid not null references public.condominiums(id) on delete restrict,
  transformation_type text not null check (transformation_type in ('Fusione','Frazionamento')),
  status text not null default 'Bozza' check (status in ('Bozza','Confermata','Annullata')),
  effective_date date not null,
  cadastral_protocol text not null default '',
  cadastral_protocol_date date,
  accounting_resolution_status text not null default 'Da verificare' check (accounting_resolution_status in ('Da verificare','Non necessaria','Risolta')),
  millesimal_review_status text not null default 'Da verificare' check (millesimal_review_status in ('Da verificare','Confermata invariata','Nuove tabelle','Da aggiornare')),
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.condominium_unit_transformation_items (
  id uuid primary key default gen_random_uuid(),
  transformation_id uuid not null references public.condominium_unit_transformations(id) on delete cascade,
  unit_id uuid not null references public.condominium_units(id) on delete restrict,
  direction text not null check (direction in ('Fonte','Destinazione')),
  sequence_no integer not null default 1 check (sequence_no > 0),
  unit_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (transformation_id,direction,sequence_no),
  unique (transformation_id,unit_id,direction)
);

alter table public.condominium_units
  add column if not exists lifecycle_status text not null default 'Attiva'
    check (lifecycle_status in ('Attiva','Storica','Soppressa')),
  add column if not exists lifecycle_effective_date date,
  add column if not exists superseded_at timestamptz;

create index if not exists idx_unit_transformations_condo_date
  on public.condominium_unit_transformations(condominium_id,effective_date desc);
create index if not exists idx_unit_transformations_workspace
  on public.condominium_unit_transformations(workspace_id);
create index if not exists idx_unit_transformations_status
  on public.condominium_unit_transformations(status);
create index if not exists idx_unit_transform_items_transformation
  on public.condominium_unit_transformation_items(transformation_id);
create index if not exists idx_unit_transform_items_unit
  on public.condominium_unit_transformation_items(unit_id);

alter table public.condominium_unit_transformations enable row level security;
alter table public.condominium_unit_transformation_items enable row level security;

revoke all on public.condominium_unit_transformations from anon;
revoke all on public.condominium_unit_transformation_items from anon;
grant select,insert,update,delete on public.condominium_unit_transformations to authenticated;
grant select,insert,update,delete on public.condominium_unit_transformation_items to authenticated;

create policy "unit transformations manager access"
on public.condominium_unit_transformations
for all to authenticated
using ((select private.can_manage_workspace_module(workspace_id,'condomini')))
with check ((select private.can_manage_workspace_module(workspace_id,'condomini')));

create policy "unit transformation items manager access"
on public.condominium_unit_transformation_items
for all to authenticated
using (
  exists (
    select 1 from public.condominium_unit_transformations t
    where t.id=transformation_id
      and (select private.can_manage_workspace_module(t.workspace_id,'condomini'))
  )
)
with check (
  exists (
    select 1 from public.condominium_unit_transformations t
    where t.id=transformation_id
      and (select private.can_manage_workspace_module(t.workspace_id,'condomini'))
  )
);
