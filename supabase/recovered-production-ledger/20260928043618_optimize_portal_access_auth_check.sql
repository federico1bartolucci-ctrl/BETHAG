alter policy "residents read own portal access" on public.portal_access
 using (
   lower(email) = (select lower(coalesce(auth.jwt() ->> 'email', '')))
   or user_id = (select auth.uid())
 );