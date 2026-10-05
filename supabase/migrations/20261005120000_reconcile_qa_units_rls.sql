alter table public.condominium_units enable row level security;
revoke execute on function public.sync_condominium_fund_usage() from anon, public;