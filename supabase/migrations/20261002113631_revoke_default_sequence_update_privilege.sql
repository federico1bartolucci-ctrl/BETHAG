-- Remove sequence UPDATE as well; retain no direct sequence privileges for client roles.
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
