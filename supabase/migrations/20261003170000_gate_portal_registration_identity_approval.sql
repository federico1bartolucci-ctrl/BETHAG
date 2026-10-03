-- Keep portal registration identity linking behind a verified-email gate.
-- The private implementation remains intact; only its client ACL and public
-- entrypoint are tightened. A manager may approve only after the member's
-- canonical email has been corrected to the verified account email.
create or replace function public.admin_approve_portal_registration(
  p_request_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_request public.portal_registration_requests%rowtype;
  v_member public.condominium_members%rowtype;
  v_workspace uuid;
  v_verified_email text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select * into v_request
  from public.portal_registration_requests
  where id = p_request_id
    and status in ('pending', 'email_mismatch')
  for update;

  if not found then
    raise exception 'Richiesta non trovata o già gestita';
  end if;

  v_workspace := v_request.workspace_id;
  if v_workspace is null
     or not private.can_manage_workspace_module(v_workspace, 'portale') then
    raise exception 'Autorizzazione gestione Portale richiesta';
  end if;

  select * into v_member
  from public.condominium_members
  where id = p_member_id
    and active = true;

  if not found then
    raise exception 'Condòmino non trovato o non attivo';
  end if;

  if not exists (
    select 1
    from public.condominiums c
    where c.id = v_member.condominium_id
      and c.workspace_id = v_workspace
      and c.archived_at is null
  ) then
    raise exception 'Richiesta e condominio non appartengono allo stesso workspace attivo';
  end if;

  select lower(trim(u.email)) into v_verified_email
  from auth.users u
  where u.id = v_request.requested_user_id
    and u.email_confirmed_at is not null;

  if v_verified_email is null
     or v_verified_email <> lower(trim(coalesce(v_request.email, ''))) then
    raise exception 'ACCOUNT_EMAIL_NOT_VERIFIED_OR_MISMATCH';
  end if;

  if v_verified_email <> lower(trim(coalesce(v_member.email, ''))) then
    raise exception 'MEMBER_EMAIL_MUST_BE_CORRECTED_BEFORE_APPROVAL';
  end if;

  -- Delegate all original membership, portal-access, and request updates to
  -- the audited private implementation after identity checks pass.
  return private.admin_approve_portal_registration(p_request_id, p_member_id);
end;
$function$;

-- Clients must enter through the checked public wrapper, never the private
-- SECURITY DEFINER implementation directly.
revoke execute on function private.admin_approve_portal_registration(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.admin_approve_portal_registration(uuid, uuid)
  to postgres, service_role;

revoke execute on function public.admin_approve_portal_registration(uuid, uuid)
  from public, anon;
grant execute on function public.admin_approve_portal_registration(uuid, uuid)
  to authenticated, service_role;
