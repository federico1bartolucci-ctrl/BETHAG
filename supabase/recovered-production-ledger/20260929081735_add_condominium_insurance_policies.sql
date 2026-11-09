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
alter table public.condominium_insurance_policies enable row level security;
drop policy if exists "insurance_manager_select" on public.condominium_insurance_policies;
drop policy if exists "insurance_manager_insert" on public.condominium_insurance_policies;
drop policy if exists "insurance_manager_update" on public.condominium_insurance_policies;
drop policy if exists "insurance_manager_delete" on public.condominium_insurance_policies;
create policy "insurance_manager_select" on public.condominium_insurance_policies for select to authenticated using (private.is_workspace_manager(workspace_id));
create policy "insurance_manager_insert" on public.condominium_insurance_policies for insert to authenticated with check (private.is_workspace_manager(workspace_id));
create policy "insurance_manager_update" on public.condominium_insurance_policies for update to authenticated using (private.is_workspace_manager(workspace_id)) with check (private.is_workspace_manager(workspace_id));
create policy "insurance_manager_delete" on public.condominium_insurance_policies for delete to authenticated using (private.is_workspace_manager(workspace_id));
grant select,insert,update,delete on public.condominium_insurance_policies to authenticated;
create index if not exists idx_condominium_insurance_policies_condo on public.condominium_insurance_policies(workspace_id, condominium_id, end_date);