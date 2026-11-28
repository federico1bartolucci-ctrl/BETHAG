
drop policy if exists "residents read own portal access" on public.portal_access;

create policy "residents read own portal access"
on public.portal_access
as permissive
for select
to authenticated
using (
  lower(email) = (select lower(coalesce(auth.jwt() ->> 'email', '')))
  or user_id = (select auth.uid())
);
