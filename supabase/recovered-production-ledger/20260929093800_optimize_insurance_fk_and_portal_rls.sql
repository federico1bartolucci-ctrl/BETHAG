
create index if not exists condominium_insurance_policies_condominium_id_idx
  on public.condominium_insurance_policies (condominium_id);

drop policy if exists "residents read own portal access" on public.portal_access;

create policy "residents read own portal access"
on public.portal_access
for select
to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  or user_id = (select auth.uid())
);
