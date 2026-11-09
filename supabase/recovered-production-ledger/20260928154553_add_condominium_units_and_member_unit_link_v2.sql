create table public.condominium_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  unit_code text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_units_unique_unit unique (condominium_id, unit_code)
);
alter table public.condominium_units enable row level security;
create index condominium_units_workspace_idx on public.condominium_units(workspace_id);
create index condominium_units_condominium_idx on public.condominium_units(condominium_id);
create policy "Managers can read condominium units" on public.condominium_units for select to authenticated using ((select private.is_workspace_manager(workspace_id)));
create policy "Managers can insert condominium units" on public.condominium_units for insert to authenticated with check ((select private.is_workspace_manager(workspace_id)));
create policy "Managers can update condominium units" on public.condominium_units for update to authenticated using ((select private.is_workspace_manager(workspace_id))) with check ((select private.is_workspace_manager(workspace_id)));
create policy "Managers can delete condominium units" on public.condominium_units for delete to authenticated using ((select private.is_workspace_manager(workspace_id)));
alter table public.condominium_members add column unit_id uuid references public.condominium_units(id) on delete set null;
create index condominium_members_unit_idx on public.condominium_members(unit_id);
insert into public.condominium_units (workspace_id, condominium_id, unit_code, data)
select distinct c.workspace_id, cm.condominium_id,
  lower(regexp_replace(trim(coalesce(cm.data->>'apartment', '')), '\\s+', ' ', 'g')),
  jsonb_build_object('apartment', trim(coalesce(cm.data->>'apartment', '')))
from public.condominium_members cm
join public.condominiums c on c.id = cm.condominium_id
where trim(coalesce(cm.data->>'apartment', '')) <> ''
on conflict (condominium_id, unit_code) do nothing;
update public.condominium_members cm
set unit_id = cu.id
from public.condominium_units cu
where cu.condominium_id = cm.condominium_id
  and cu.unit_code = lower(regexp_replace(trim(coalesce(cm.data->>'apartment', '')), '\\s+', ' ', 'g'))
  and cm.unit_id is null;