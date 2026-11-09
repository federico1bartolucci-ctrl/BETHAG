-- BETHAG security hardening
-- Users may update only their own profile's editable identity fields through the API.
revoke update on public.profiles from authenticated;
grant update (full_name, email) on public.profiles to authenticated;
revoke insert on public.profiles from authenticated;