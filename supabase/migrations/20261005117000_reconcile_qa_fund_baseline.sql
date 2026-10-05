create table if not exists public.condominium_funds (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 name text not null, purpose text not null default '', target_amount numeric not null default 0,
 allocated_amount numeric not null default 0, used_amount numeric not null default 0,
 active boolean not null default true, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.condominium_fund_availability (
 id uuid, workspace_id uuid, condominium_id uuid, name text, purpose text,
 target_amount numeric, allocated_amount numeric, used_amount numeric, available_amount numeric,
 target_remaining_amount numeric, active boolean, notes text, created_at timestamptz, updated_at timestamptz
);