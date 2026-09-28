-- Secure condominium deletion, versioned separately so deployed databases receive it.
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
  delete from public.condominiums
  where id = v_id
    and workspace_id = p_workspace_id;
end;
$function$;

revoke all on function public.delete_condominium(uuid,bigint) from public;
revoke execute on function public.delete_condominium(uuid,bigint) from anon;
grant execute on function public.delete_condominium(uuid,bigint) to authenticated;
