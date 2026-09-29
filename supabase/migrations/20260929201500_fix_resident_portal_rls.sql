-- Fix resident/council portal authorization for explicit user links and e-mail mismatches.
-- The approved registration flow links condominium_members.user_id to the
-- authenticated portal user. RLS must honor that relationship instead of
-- requiring the member e-mail to equal the portal e-mail.

CREATE OR REPLACE FUNCTION private.can_access_resident_condominium(target_condominium uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = auth.uid()
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;