-- Reconcile condominium_fund_availability with production: it is a
-- security-invoker view over condominium_funds, not a standalone table.
drop view if exists public.condominium_fund_availability;
drop table if exists public.condominium_fund_availability;

create view public.condominium_fund_availability
with (security_invoker = true)
as
select
  id,
  workspace_id,
  condominium_id,
  name,
  purpose,
  target_amount,
  allocated_amount,
  used_amount,
  greatest(round(allocated_amount - used_amount, 2), 0::numeric) as available_amount,
  greatest(round(target_amount - allocated_amount, 2), 0::numeric) as target_remaining_amount,
  active,
  notes,
  created_at,
  updated_at
from public.condominium_funds f;

grant all on table public.condominium_fund_availability to authenticated, service_role;
revoke all on table public.condominium_fund_availability from anon;
