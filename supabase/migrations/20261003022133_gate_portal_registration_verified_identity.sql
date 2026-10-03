-- Enforce verified identity and canonical email before portal registration approval.
-- This wrapper delegates all membership writes to the existing private routine.
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

  if v_request.status = 'email_mismatch'
     and v_request.matched_member_id is not null
     and v_request.matched_member_id <> v_member.id then
    raise exception 'MISMATCH_REQUEST_MUST_USE_ORIGINAL_MATCHED_MEMBER';
  end if;

  if v_verified_email <> lower(trim(coalesce(v_member.email, ''))) then
    raise exception 'MEMBER_EMAIL_MUST_BE_CORRECTED_BEFORE_APPROVAL';
  end if;

  return private.admin_approve_portal_registration(p_request_id, p_member_id);
end;
$function$;

-- Keep the private SECURITY DEFINER implementation inaccessible to clients.
revoke execute on function private.admin_approve_portal_registration(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.admin_approve_portal_registration(uuid, uuid)
  to postgres;

-- This endpoint is a user-facing manager action and requires auth.uid().
revoke execute on function public.admin_approve_portal_registration(uuid, uuid)
  from public, anon, service_role;
grant execute on function public.admin_approve_portal_registration(uuid, uuid)
  to authenticated;
