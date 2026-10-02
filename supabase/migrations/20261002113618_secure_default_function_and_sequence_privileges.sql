-- Make future API exposure opt-in for objects created by postgres in public.
-- Existing function and sequence grants are not changed.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
