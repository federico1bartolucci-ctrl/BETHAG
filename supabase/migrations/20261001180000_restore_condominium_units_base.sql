-- Restore the missing base schema for condominium units on the development branch.
-- Keep production untouched; later migrations add lifecycle and financial safeguards.
create table if not exists public.condominium_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  unit_code text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  building_code text not null default '',
  lifecycle_status text not null default 'Attiva',
  lifecycle_effective_date date,
  superseded_at timestamptz,
  constraint condominium_units_lifecycle_status_check check (lifecycle_status in ('Attiva','Storica','Soppressa'))
);
create index if not exists condominium_units_building_code_idx on public.condominium_units(workspace_id,condominium_id,building_code);
create unique index if not exists condominium_units_code_building_uq on public.condominium_units(condominium_id,lower(btrim(building_code)),lower(btrim(unit_code)));
create index if not exists condominium_units_code_lookup_idx on public.condominium_units(condominium_id,unit_code);
create index if not exists condominium_units_condominium_idx on public.condominium_units(condominium_id);
create unique index if not exists condominium_units_condominium_unit_code_normalized_uidx on public.condominium_units(condominium_id,lower(trim(unit_code)));
create unique index if not exists condominium_units_unique_unit on public.condominium_units(condominium_id,lower(btrim(unit_code)));
create index if not exists condominium_units_workspace_idx on public.condominium_units(workspace_id);
alter table public.condominium_members add column if not exists unit_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='condominium_members_unit_id_fkey' and conrelid='public.condominium_members'::regclass) then
  alter table public.condominium_members add constraint condominium_members_unit_id_fkey foreign key(unit_id) references public.condominium_units(id) on delete set null;
 end if;
end $$;
create index if not exists condominium_members_unit_id_idx on public.condominium_members(unit_id);
alter table public.condominium_units enable row level security;
drop policy if exists "Authorized condominium managers can read units" on public.condominium_units;
create policy "Authorized condominium managers can read units" on public.condominium_units for select to authenticated using (
 (select private.can_access_workspace_module(workspace_id,'condomini'::text))
 or (exists(select 1 from public.condominiums c where c.id=condominium_units.condominium_id and c.archived_at is null)
 and exists(select 1 from public.portal_access pa join public.condominium_members cm on cm.condominium_id=pa.condominium_id and cm.unit_id=condominium_units.id and cm.active=true and ((pa.user_id is not null and cm.user_id=(select auth.uid())) or lower(cm.email)=lower(pa.email))
 where pa.condominium_id=condominium_units.condominium_id and pa.active=true and pa.role in ('resident','council') and (pa.user_id=(select auth.uid()) or lower(pa.email)=lower(coalesce((select auth.jwt())->>'email','')))))
);
drop policy if exists "Authorized condominium managers can insert units" on public.condominium_units;
create policy "Authorized condominium managers can insert units" on public.condominium_units for insert to authenticated with check ((select private.can_manage_workspace_module(workspace_id,'condomini'::text)));
drop policy if exists "Authorized condominium managers can update units" on public.condominium_units;
create policy "Authorized condominium managers can update units" on public.condominium_units for update to authenticated using ((select private.can_manage_workspace_module(workspace_id,'condomini'::text))) with check ((select private.can_manage_workspace_module(workspace_id,'condomini'::text)));
drop policy if exists "Authorized condominium managers can delete units" on public.condominium_units;
create policy "Authorized condominium managers can delete units" on public.condominium_units for delete to authenticated using ((select private.can_manage_workspace_module(workspace_id,'condomini'::text)));
