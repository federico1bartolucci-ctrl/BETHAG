-- Prevent direct RPC callers from attaching an unverified account to a new owner.
-- The current client sends NULL; portal identity must be linked only through
-- a separately verified invitation/acceptance flow.
create or replace function public.confirm_condominium_member_transfer(
  p_unit_id uuid,
  p_outgoing_member_id uuid,
  p_incoming_name text,
  p_incoming_email text,
  p_incoming_user_id uuid,
  p_transfer_date date,
  p_transfer_type text default 'Vendita',
  p_notes text default '',
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_incoming_user_id is not null then
    raise exception 'INCOMING_IDENTITY_REQUIRES_VERIFICATION'
      using errcode = '22023';
  end if;

  return private.confirm_condominium_member_transfer(
    p_unit_id,
    p_outgoing_member_id,
    p_incoming_name,
    p_incoming_email,
    null,
    p_transfer_date,
    p_transfer_type,
    p_notes,
    p_data
  );
end;
$function$;

-- CREATE OR REPLACE retains the existing function ACL; state the intended
-- caller set explicitly and keep private implementation inaccessible to clients.
revoke execute on function public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon, public;
grant execute on function public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) to authenticated;
revoke execute on function private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon, public, authenticated;
