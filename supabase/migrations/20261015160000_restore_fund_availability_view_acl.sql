begin;
-- Restore the Production ACL on the recreated view. Explicit revoke is needed
-- because QA's effective default ACL can add ancillary privileges to new views.
revoke all privileges on table public.condominium_fund_availability from anon, public;
grant all privileges on table public.condominium_fund_availability to authenticated, service_role;
commit;
