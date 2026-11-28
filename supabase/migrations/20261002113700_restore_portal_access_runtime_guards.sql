-- Restore portal runtime guards and final authorization policies.
-- Runs after 20260930185301/07, which define and grant the manager helper.
-- This is intentionally idempotent for branches with partial schema drift.

create or replace function public.prevent_archived_condominium_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_condominium_id uuid;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  v_condominium_id := new.condominium_id;

  if v_condominium_id is not null and exists (
    select 1
    from public.condominiums c
    where c.id = v_condominium_id
      and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato: modifica non consentita';
  end if;

  return new;
end;
$function$;

create or replace function public.validate_portal_access_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_workspace uuid;
  v_member_condominium uuid;
begin
  select workspace_id
    into v_workspace
  from public.condominiums
  where id = new.condominium_id;

  if v_workspace is null then
    raise exception 'Condominio portale non trovato';
  end if;

  if v_workspace <> new.workspace_id then
    raise exception 'Workspace e condominio del portale non coincidono';
  end if;

  if new.member_id is not null then
    select condominium_id
      into v_member_condominium
    from public.condominium_members
    where id = new.member_id;

    if v_member_condominium is null then
      raise exception 'Membro portale non trovato';
    end if;

    if v_member_condominium <> new.condominium_id then
      raise exception 'Il membro portale appartiene a un altro condominio';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_archived_condominium_mutation() from public, anon, authenticated;
revoke all on function public.validate_portal_access_scope() from public, anon, authenticated;

drop trigger if exists trg_prevent_archived_condominium_mutation on public.portal_access;
create trigger trg_prevent_archived_condominium_mutation
before insert or update on public.portal_access
for each row execute function public.prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_portal_access_scope on public.portal_access;
create trigger trg_validate_portal_access_scope
before insert or update on public.portal_access
for each row execute function public.validate_portal_access_scope();

-- Ensure residents can only read active access rows for non-archived condos.
drop policy if exists "residents read own portal access" on public.portal_access;
create policy "residents read own portal access"
on public.portal_access
as permissive
for select
to authenticated
using (
  active = true
  and exists (
    select 1
    from public.condominiums c
    where c.id = portal_access.condominium_id
      and c.archived_at is null
  )
  and (
    user_id = (select auth.uid())
    or (
      user_id is null
      and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  )
);

-- The helper is introduced in migration 20260930185301.
drop policy if exists "authorized managers manage portal access" on public.portal_access;
create policy "authorized managers manage portal access"
on public.portal_access
as permissive
for all
to authenticated
using (private.can_manage_workspace_module(workspace_id, 'portale'))
with check (private.can_manage_workspace_module(workspace_id, 'portale'));
