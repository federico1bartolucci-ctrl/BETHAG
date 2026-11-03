-- Remove non-application table privileges from authenticated clients.
-- RLS does not govern TRUNCATE, and BETHAG's client does not need DDL-style table privileges.
revoke truncate, references, trigger on table
  public.communication_recipients,
  public.condominium_member_transfers,
  public.condominium_unit_transformation_items,
  public.condominium_unit_transformations
from authenticated;

-- Prevent those extra privileges from being inherited by future public tables
-- created by the postgres migration role. Keep normal DML grants unchanged.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;