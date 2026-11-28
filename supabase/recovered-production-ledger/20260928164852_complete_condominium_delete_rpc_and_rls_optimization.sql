
create or replace function public.delete_condominium(
  p_workspace_id uuid,
  p_legacy_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_condominium_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Operazione non autorizzata';
  end if;

  select c.id
    into v_condominium_id
  from public.condominiums c
  where c.workspace_id = p_workspace_id
    and c.legacy_id = p_legacy_id
  for update;

  if v_condominium_id is null then
    raise exception 'Condominio non trovato';
  end if;

  delete from public.portal_registration_requests pr
  where pr.workspace_id = p_workspace_id
    and (
      pr.matched_member_id in (
        select cm.id
        from public.condominium_members cm
        where cm.condominium_id = v_condominium_id
      )
      or pr.requested_user_id in (
        select cm.user_id
        from public.condominium_members cm
        where cm.condominium_id = v_condominium_id
          and cm.user_id is not null
      )
    );

  delete from public.portal_access where condominium_id = v_condominium_id;
  delete from public.condominium_requests where condominium_id = v_condominium_id;
  delete from public.communications where condominium_id = v_condominium_id;
  delete from public.activities where condominium_id = v_condominium_id;
  delete from public.suppliers where condominium_id = v_condominium_id;
  delete from public.assemblies where condominium_id = v_condominium_id;
  delete from public.deadlines where condominium_id = v_condominium_id;
  delete from public.documents where condominium_id = v_condominium_id;
  delete from public.condominium_members where condominium_id = v_condominium_id;
  delete from public.condominium_units where condominium_id = v_condominium_id;
  delete from public.condominiums
  where id = v_condominium_id
    and workspace_id = p_workspace_id;
end;
$function$;

revoke execute on function public.delete_condominium(uuid, bigint) from anon;
grant execute on function public.delete_condominium(uuid, bigint) to authenticated;

drop policy if exists "residents read own portal access" on public.portal_access;

create policy "residents read own portal access"
on public.portal_access
as permissive
for select
to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  or user_id = (select auth.uid())
);
