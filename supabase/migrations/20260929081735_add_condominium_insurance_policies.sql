-- BETHAG: polizze assicurative del condominio.
-- Migration idempotente e allineata allo schema applicativo corrente.
create table if not exists public.condominium_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  company_name text not null default '',
  policy_number text not null default '',
  policy_type text not null default 'Globale fabbricati',
  coverage text not null default '',
  start_date date,
  end_date date,
  premium numeric(12,2) not null default 0,
  deductible numeric(12,2) not null default 0,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  notes text not null default '',
  document_id bigint,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilità con eventuali istanze che abbiano già creato la tabella
-- con una versione precedente dello schema.
alter table public.condominium_insurance_policies
  add column if not exists company_name text not null default '',
  add column if not exists policy_number text not null default '',
  add column if not exists policy_type text not null default 'Globale fabbricati',
  add column if not exists coverage text not null default '',
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists premium numeric(12,2) not null default 0,
  add column if not exists deductible numeric(12,2) not null default 0,
  add column if not exists contact_name text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists contact_phone text not null default '',
  add column if not exists notes text not null default '',
  add column if not exists document_id bigint,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists condominium_insurance_policies_condominium_idx
  on public.condominium_insurance_policies(condominium_id, end_date);

alter table public.condominium_insurance_policies enable row level security;

drop policy if exists "authorized users read insurance policies" on public.condominium_insurance_policies;
create policy "authorized users read insurance policies"
on public.condominium_insurance_policies
for select to authenticated
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = condominium_insurance_policies.workspace_id
      and wm.user_id = auth.uid()
      and wm.active = true
  )
  or exists (
    select 1
    from public.portal_access pa
    where pa.workspace_id = condominium_insurance_policies.workspace_id
      and pa.condominium_id = condominium_insurance_policies.condominium_id
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      )
  )
);

drop policy if exists "authorized managers manage insurance policies" on public.condominium_insurance_policies;
create policy "authorized managers manage insurance policies"
on public.condominium_insurance_policies
for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'condomini'))
with check (private.can_manage_workspace_module(workspace_id,'condomini'));

revoke all on table public.condominium_insurance_policies from anon;
grant select, insert, update, delete on table public.condominium_insurance_policies to authenticated;