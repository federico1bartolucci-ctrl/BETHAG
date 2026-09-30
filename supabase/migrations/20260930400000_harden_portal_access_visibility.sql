-- Restrict portal self-read to active access records.
-- Prefer the authenticated user link; use e-mail only for not-yet-linked records.
drop policy if exists "residents read own portal access" on public.portal_access;

create policy "residents read own portal access"
on public.portal_access for select to authenticated
using (
  active = true
  and (
    user_id = auth.uid()
    or (
      user_id is null
      and lower(email) = lower(coalesce(auth.jwt()->>'email',''))
    )
  )
);