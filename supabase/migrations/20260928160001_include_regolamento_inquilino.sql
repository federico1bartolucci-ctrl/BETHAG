-- Allinea i permessi del Portale alla policy BETHAG:
-- l'inquilino può consultare spese ordinarie, comunicazioni/avvisi e regolamento.

create or replace function private.apply_portal_member_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  member_role text;
begin
  select coalesce(cm.data->>'role', cm.role) into member_role
  from public.condominium_members cm
  where cm.condominium_id = new.condominium_id
    and (
      (new.user_id is not null and cm.user_id = new.user_id)
      or (new.email is not null and lower(trim(cm.email)) = lower(trim(new.email)))
    )
    and cm.active = true
  order by case when new.user_id is not null and cm.user_id = new.user_id then 0 else 1 end, cm.created_at
  limit 1;

  if member_role = 'Inquilino' then
    new.permissions := '["pagamenti_ordinari","comunicazioni","regolamento"]'::jsonb;
  elsif member_role = 'Proprietario' then
    new.permissions := '["documenti","verbali","regolamento","pagamenti_ordinari","pagamenti_straordinari","assemblee","comunicazioni"]'::jsonb;
  end if;

  return new;
end;
$function$;
