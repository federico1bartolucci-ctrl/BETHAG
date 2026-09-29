-- BETHAG: anagrafica delle polizze assicurative per condominio
create table if not exists public.condominium_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  policy_number text not null,
  insurer text not null,
  policy_type text not null default 'Globale fabbricati',
  policyholder text not null default '',
  coverage text not null default '',
  premium numeric(12,2),
  deductible numeric(12,2),
  start_date date,
  expiry_date date,
  status text not null default 'Attiva' check (status in ('Attiva','In scadenza','Scaduta','Sospesa')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists condominium_insurance_policies_condominium_idx
  on public.condominium_insurance_policies(condominium_id, expiry_date);

alter table public.condominium_insurance_policies enable row level security;

drop policy if exists "authorized users read insurance policies" on public.condominium_insurance_policies;
create policy "authorized users read insurance policies"
on public.condominium_insurance_policies
for select to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
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
