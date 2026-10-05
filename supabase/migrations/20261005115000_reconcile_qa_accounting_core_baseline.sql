-- Reconcile QA with the production accounting core required by later migrations.
create table if not exists public.condominium_fiscal_years (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 name text not null, start_date date not null, end_date date not null,
 status text not null default 'Aperto', opening_balance numeric not null default 0,
 notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.condominium_ledger_entries (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 fiscal_year_id uuid, entry_date date not null, direction text not null, category text not null,
 description text not null, amount numeric not null, payment_status text not null default 'Registrato',
 due_date date, supplier_id uuid, unit_id uuid, member_id uuid, document_id uuid,
 notes text not null default '', data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 fund_id uuid, expense_type text not null default 'Ordinaria', deliberation_date date, assembly_id uuid
);
create table if not exists public.condominium_expense_allocations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 ledger_entry_id uuid not null, unit_id uuid, member_id uuid,
 allocation_basis text not null default 'Millesimi', millesimi numeric, amount numeric not null default 0,
 paid_amount numeric not null default 0, due_date date, status text not null default 'Da pagare',
 notes text not null default '', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), allocation_table_id uuid
);
create table if not exists public.condominium_installments (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 fiscal_year_id uuid, member_id uuid, unit_id uuid, title text not null, due_date date,
 amount numeric not null default 0, paid_amount numeric not null default 0,
 status text not null default 'Da pagare', notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), ledger_entry_id uuid
);
create table if not exists public.condominium_fiscal_carryovers (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 source_fiscal_year_id uuid not null, target_fiscal_year_id uuid not null, unit_id uuid, member_id uuid,
 balance numeric not null, kind text not null, status text not null default 'Da riportare',
 notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.condominium_member_transfers (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 unit_id uuid not null, outgoing_member_id uuid not null, incoming_member_id uuid,
 transfer_date date not null, transfer_type text not null default 'Vendita',
 status text not null default 'Confermato', notes text not null default '',
 data jsonb not null default '{}'::jsonb, created_by uuid, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), closed_at timestamptz, closed_by uuid
);
create table if not exists public.condominium_payment_movements (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 installment_id uuid not null, payment_date date not null, amount numeric not null default 0,
 method text not null default 'Bonifico', reference text not null default '', notes text not null default '',
 created_at timestamptz not null default now()
);
