-- Portal resident access must remain aligned with an active condominium registry member.
create or replace function private.can_access_resident_condominium(target_condominium uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and lower(cm.email) = lower(pa.email)
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  );
$function$;

create or replace function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and lower(cm.email) = lower(pa.email)
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role = 'resident'
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;