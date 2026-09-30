create table if not exists public.condominium_accounting_settings(
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid not null references public.condominiums(id) on delete cascade,
 accounting_start_date date not null,
 accounting_end_date date not null,
 ordinary_installment_count integer not null default 12 check (ordinary_installment_count between 1 and 12),
 ordinary_due_dates date[] not null default '{}',
 extraordinary_mode text not null default 'separata' check (extraordinary_mode in ('integrata','separata')),
 extraordinary_allow_multi_year boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,condominium_id),
 check(accounting_start_date <= accounting_end_date),
 check(coalesce(array_length(ordinary_due_dates,1),0) <= 12)
);
alter table public.condominium_accounting_settings enable row level security;
drop policy if exists "managers manage accounting settings" on public.condominium_accounting_settings;
create policy "managers manage accounting settings" on public.condominium_accounting_settings for all to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita')) with check(private.can_manage_workspace_module(workspace_id,'contabilita'));
drop policy if exists "authorized users read accounting settings" on public.condominium_accounting_settings;
create policy "authorized users read accounting settings" on public.condominium_accounting_settings for select to authenticated using(private.can_access_workspace_module(workspace_id,'contabilita'));
create index if not exists condominium_accounting_settings_condo_idx on public.condominium_accounting_settings(condominium_id);
grant select,insert,update,delete on public.condominium_accounting_settings to authenticated;