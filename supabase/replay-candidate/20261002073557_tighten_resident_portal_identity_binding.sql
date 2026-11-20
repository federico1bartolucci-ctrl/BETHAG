create or replace function private.can_access_resident_condominium(target_condominium uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.condominiums c
    join public.portal_access pa
      on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.member_id is not null and cm.id = pa.member_id)
       or (
         pa.member_id is null
         and (
           (pa.user_id is not null and cm.user_id = pa.user_id)
           or (
             pa.user_id is null
             and pa.email is not null
             and cm.email is not null
             and lower(cm.email) = lower(pa.email)
           )
         )
       )
     )
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or (
          pa.user_id is null
          and lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        )
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
    from public.condominiums c
    join public.portal_access pa
      on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.member_id is not null and cm.id = pa.member_id)
       or (
         pa.member_id is null
         and (
           (pa.user_id is not null and cm.user_id = pa.user_id)
           or (
             pa.user_id is null
             and pa.email is not null
             and cm.email is not null
             and lower(cm.email) = lower(pa.email)
           )
         )
       )
     )
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or (
          pa.user_id is null
          and lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        )
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;