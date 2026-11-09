create or replace function public.apply_portal_member_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_role text;
begin
  select cm.role
    into member_role
  from public.condominium_members cm
  where cm.condominium_id = new.condominium_id
    and (
      (new.user_id is not null and cm.user_id = new.user_id)
      or (
        new.email is not null
        and lower(trim(cm.email)) = lower(trim(new.email))
      )
    )
    and cm.active = true
  order by
    case when new.user_id is not null and cm.user_id = new.user_id then 0 else 1 end,
    cm.created_at
  limit 1;

  if member_role = 'Inquilino' then
    new.permissions := '["pagamenti_ordinari","comunicazioni"]'::jsonb;
  elsif member_role = 'Proprietario' then
    new.permissions := '["documenti","verbali","regolamento","pagamenti_ordinari","pagamenti_straordinari","assemblee","comunicazioni"]'::jsonb;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_portal_member_permissions on public.portal_access;

create trigger trg_portal_member_permissions
before insert or update of email, user_id, condominium_id
on public.portal_access
for each row
execute function public.apply_portal_member_permissions();

update public.portal_access pa
set permissions = case
  when cm.role = 'Inquilino'
    then '["pagamenti_ordinari","comunicazioni"]'::jsonb
  when cm.role = 'Proprietario'
    then '["documenti","verbali","regolamento","pagamenti_ordinari","pagamenti_straordinari","assemblee","comunicazioni"]'::jsonb
  else pa.permissions
end
from public.condominium_members cm
where cm.condominium_id = pa.condominium_id
  and cm.active = true
  and (
    (pa.user_id is not null and cm.user_id = pa.user_id)
    or (pa.email is not null and lower(trim(cm.email)) = lower(trim(pa.email)))
  );