create or replace function public.confirm_condominium_member_transfer(
 p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text,
 p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text default 'Vendita',
 p_notes text default '', p_data jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
begin
 return private.confirm_condominium_member_transfer(
  p_unit_id,p_outgoing_member_id,p_incoming_name,p_incoming_email,p_incoming_user_id,
  p_transfer_date,p_transfer_type,p_notes,p_data
 );
end;
$function$;

create or replace function public.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
 return private.close_condominium_member_transfer(p_transfer_id);
end;
$function$;

revoke all on function public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from public, anon;
grant execute on function public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) to authenticated, service_role;
revoke all on function public.close_condominium_member_transfer(uuid) from public, anon;
grant execute on function public.close_condominium_member_transfer(uuid) to authenticated, service_role;