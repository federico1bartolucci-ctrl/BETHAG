-- Remove non-application table privileges from authenticated clients.
-- RLS does not govern TRUNCATE; BETHAG's client does not need these privileges.
revoke truncate, references, trigger on table
  public.communication_recipients,
  public.condominium_member_transfers,
  public.condominium_unit_transformation_items,
  public.condominium_unit_transformations
from authenticated;

-- Keep future public tables created by the postgres migration role least-privileged.
-- Normal DML grants are unchanged; explicit grants must be added where required.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
