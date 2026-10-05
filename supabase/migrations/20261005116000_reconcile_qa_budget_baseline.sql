create table if not exists public.condominium_budgets (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 fiscal_year_id uuid, category text not null default 'Generale', description text not null default '',
 amount numeric not null default 0, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);