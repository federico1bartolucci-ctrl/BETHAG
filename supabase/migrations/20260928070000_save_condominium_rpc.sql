-- Persist the condominium save RPC in version-controlled migrations.
-- The function performs its own authenticated administrator check.

create or replace function public.save_condominium(
  p_workspace_id uuid,
  p_legacy_id bigint,
  p_name text,
  p_address text,
  p_city text,
  p_postal_code text,
  p_province text,
  p_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Autorizzazione amministratore richiesta';
  end if;

  insert into public.condominiums (
    workspace_id,
    legacy_id,
    name,
    address,
    city,
    postal_code,
    province,
    data
  )
  values (
    p_workspace_id,
    p_legacy_id,
    p_name,
    p_address,
    p_city,
    p_postal_code,
    p_province,
    coalesce(p_data, '{}'::jsonb)
  )
  on conflict (workspace_id, legacy_id)
  do update set
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    postal_code = excluded.postal_code,
    province = excluded.province,
    data = excluded.data,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) from public;
revoke execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) from anon;
grant execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) to authenticated;


-- Delete a condominium and all workspace-owned records linked to it.
create or replace function public.delete_condominium(
  p_workspace_id uuid,
  p_legacy_id bigint
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Autorizzazione amministratore richiesta';
  end if;

  select id into v_id
  from public.condominiums
  where workspace_id = p_workspace_id
    and legacy_id = p_legacy_id
  limit 1;

  if v_id is null then
    return;
  end if;

  delete from public.condominium_members where condominium_id = v_id;
  delete from public.portal_access where condominium_id = v_id;
  delete from public.documents where condominium_id = v_id;
  delete from public.deadlines where condominium_id = v_id;
  delete from public.assemblies where condominium_id = v_id;
  delete from public.suppliers where condominium_id = v_id;
  delete from public.activities where condominium_id = v_id;
  delete from public.communications where condominium_id = v_id;
  delete from public.condominium_requests where condominium_id = v_id;
  delete from public.condominiums where id = v_id and workspace_id = p_workspace_id;
end;
$function$;

revoke all on function public.delete_condominium(uuid,bigint) from public;
revoke execute on function public.delete_condominium(uuid,bigint) from anon;
grant execute on function public.delete_condominium(uuid,bigint) to authenticated;
