
create table if not exists public.condominium_register_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  item_type text not null default 'Sicurezza',
  category text not null default 'Generale',
  title text not null,
  location text not null default '',
  responsible text not null default '',
  expiry_date date,
  status text not null default 'Attivo',
  document_id uuid,
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.condominium_register_items enable row level security;
drop policy if exists "condominium_register_items_manager_all" on public.condominium_register_items;
create policy "condominium_register_items_manager_all" on public.condominium_register_items
for all to authenticated
using (private.is_workspace_manager(workspace_id))
with check (private.is_workspace_manager(workspace_id));
grant select, insert, update, delete on public.condominium_register_items to authenticated;
create index if not exists condominium_register_items_workspace_condo_idx
on public.condominium_register_items(workspace_id, condominium_id, item_type, expiry_date);

create table if not exists public.condominium_suppliers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  business_name text not null,
  contact_name text not null default '',
  fiscal_code text not null default '',
  vat_number text not null default '',
  email text not null default '',
  phone text not null default '',
  category text not null default '',
  contract_start date,
  contract_end date,
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.condominium_suppliers enable row level security;
drop policy if exists "condominium_suppliers_manager_all" on public.condominium_suppliers;
create policy "condominium_suppliers_manager_all" on public.condominium_suppliers
for all to authenticated
using (private.is_workspace_manager(workspace_id))
with check (private.is_workspace_manager(workspace_id));
grant select, insert, update, delete on public.condominium_suppliers to authenticated;
create index if not exists condominium_suppliers_workspace_condo_idx
on public.condominium_suppliers(workspace_id, condominium_id, category);
