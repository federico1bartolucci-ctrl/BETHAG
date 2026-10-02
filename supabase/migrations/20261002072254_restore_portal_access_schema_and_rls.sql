-- Restore portal access schema and row-level security for QA parity.
-- Reconstructed from the production schema, constraints, indexes, triggers and policies.
alter table public.condominiums add column if not exists archived_at timestamptz;

create table if not exists public.portal_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  legacy_id bigint,
  name text not null,
  email text not null,
  role text not null default 'resident' check (role in ('resident','council')),
  apartment text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  user_id uuid references public.profiles(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  member_id uuid references public.condominium_members(id) on delete set null,
  constraint portal_access_workspace_legacy_unique unique (workspace_id, legacy_id)
);

create index if not exists portal_access_condominium_idx on public.portal_access using btree (condominium_id);
create index if not exists portal_access_email_idx on public.portal_access using btree (lower(email));
create index if not exists portal_access_member_id_idx on public.portal_access using btree (member_id);
create index if not exists portal_access_user_id_idx on public.portal_access using btree (user_id);
create index if not exists portal_access_workspace_idx on public.portal_access using btree (workspace_id);
create unique index if not exists uq_portal_access_workspace_condominium_email_ci
  on public.portal_access using btree (workspace_id, condominium_id, lower(email)) where email is not null;
create unique index if not exists uq_portal_access_workspace_condominium_email
  on public.portal_access (workspace_id, condominium_id, (lower(trim(email))));

create or replace function private.can_manage_workspace_module(target_workspace uuid, required_permission text)
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (wm.role = 'admin' or (wm.role = 'collaborator' and coalesce(wm.permissions, '[]'::jsonb) ? required_permission))
  );
$function$;

create or replace function private.apply_portal_member_permissions()
returns trigger
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $function$
declare member_role text;
begin
  select coalesce(cm.data->>'role',cm.role) into member_role
  from public.condominium_members cm where cm.id=new.member_id and cm.active=true;
  if member_role is null then
    select coalesce(cm.data->>'role',cm.role) into member_role
    from public.condominium_members cm
    where cm.condominium_id=new.condominium_id
      and ((new.user_id is not null and cm.user_id=new.user_id) or lower(trim(cm.email))=lower(trim(new.email)))
      and cm.active=true
    order by case when new.user_id is not null and cm.user_id=new.user_id then 0 else 1 end,cm.created_at
    limit 1;
  end if;
  if member_role='Inquilino' then
    new.permissions:='["pagamenti_ordinari","comunicazioni","regolamento"]'::jsonb;
  elsif member_role='Proprietario' then
    new.permissions:='["documenti","verbali","regolamento","pagamenti_ordinari","pagamenti_straordinari","assemblee","comunicazioni"]'::jsonb;
  end if;
  return new;
end;
$function$;

create or replace function public.prevent_archived_condominium_mutation()
returns trigger
language plpgsql security definer set search_path to ''
as $function$
declare v_condominium_id uuid;
begin
  if tg_op='DELETE' then return old; end if;
  v_condominium_id:=new.condominium_id;
  if v_condominium_id is not null and exists (
    select 1 from public.condominiums c where c.id=v_condominium_id and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato: modifica non consentita';
  end if;
  return new;
end;
$function$;

create or replace function public.validate_portal_access_scope()
returns trigger
language plpgsql security definer set search_path to ''
as $function$
declare v_workspace uuid; v_member_condominium uuid;
begin
  select workspace_id into v_workspace from public.condominiums where id=new.condominium_id;
  if v_workspace is null then raise exception 'Condominio portale non trovato'; end if;
  if v_workspace<>new.workspace_id then raise exception 'Workspace e condominio del portale non coincidono'; end if;
  if new.member_id is not null then
    select condominium_id into v_member_condominium from public.condominium_members where id=new.member_id;
    if v_member_condominium is null then raise exception 'Membro portale non trovato'; end if;
    if v_member_condominium<>new.condominium_id then raise exception 'Il membro portale appartiene a un altro condominio'; end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_portal_member_permissions on public.portal_access;
create trigger trg_portal_member_permissions before insert or update of email,user_id,member_id,condominium_id,data
  on public.portal_access for each row execute function private.apply_portal_member_permissions();
drop trigger if exists trg_prevent_archived_condominium_mutation on public.portal_access;
create trigger trg_prevent_archived_condominium_mutation before insert or update
  on public.portal_access for each row execute function public.prevent_archived_condominium_mutation();
drop trigger if exists trg_validate_portal_access_scope on public.portal_access;
create trigger trg_validate_portal_access_scope before insert or update
  on public.portal_access for each row execute function public.validate_portal_access_scope();

alter table public.portal_access enable row level security;
drop policy if exists "authorized managers manage portal access" on public.portal_access;
create policy "authorized managers manage portal access" on public.portal_access for all to authenticated
  using (private.can_manage_workspace_module(workspace_id,'portale'))
  with check (private.can_manage_workspace_module(workspace_id,'portale'));
drop policy if exists "residents read own portal access" on public.portal_access;
create policy "residents read own portal access" on public.portal_access for select to authenticated
  using (
    active=true
    and exists (select 1 from public.condominiums c where c.id=portal_access.condominium_id and c.archived_at is null)
    and (user_id=(select auth.uid()) or (user_id is null and lower(email)=lower(coalesce((select auth.jwt()->>'email'),''))))
  );

grant select,insert,update,delete on public.portal_access to authenticated;
revoke all on public.portal_access from anon;

create or replace function private.can_access_resident_condominium(target_condominium uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from public.portal_access pa
    join public.condominium_members cm on cm.condominium_id=pa.condominium_id and cm.active=true
      and ((pa.user_id is not null and cm.user_id=pa.user_id) or lower(cm.email)=lower(pa.email))
    where pa.condominium_id=target_condominium and pa.active=true and pa.role in ('resident','council')
      and (pa.user_id=auth.uid() or lower(pa.email)=lower(coalesce((select auth.jwt()->>'email'),'')))
  );
$function$;

create or replace function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from public.portal_access pa
    join public.condominium_members cm on cm.condominium_id=pa.condominium_id and cm.active=true
      and ((pa.user_id is not null and cm.user_id=pa.user_id) or lower(cm.email)=lower(pa.email))
    where pa.condominium_id=target_condominium and pa.active=true and pa.role in ('resident','council')
      and (pa.user_id=auth.uid() or lower(pa.email)=lower(coalesce((select auth.jwt()->>'email'),'')))
      and coalesce(pa.permissions,'[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;

revoke execute on function private.can_access_resident_condominium(uuid) from public,anon;
revoke execute on function private.can_access_resident_condominium_module(uuid,text) from public,anon;
revoke execute on function private.can_manage_workspace_module(uuid,text) from public,anon;
grant execute on function private.can_access_resident_condominium(uuid) to authenticated;
grant execute on function private.can_access_resident_condominium_module(uuid,text) to authenticated;
grant execute on function private.can_manage_workspace_module(uuid,text) to authenticated;
