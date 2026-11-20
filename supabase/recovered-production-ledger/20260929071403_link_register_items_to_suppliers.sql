alter table public.condominium_register_items add column if not exists supplier_id uuid references public.condominium_suppliers(id) on delete set null;
alter table public.condominium_register_items add column if not exists estimated_amount numeric not null default 0;
create index if not exists condominium_register_items_supplier_idx on public.condominium_register_items(supplier_id);