-- BETHAG optional account security and protected destructive actions
create table if not exists public.user_security_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personal_code_hash text,
  personal_code_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.user_security_settings enable row level security;
drop policy if exists "Users can read own security settings" on public.user_security_settings;
create policy "Users can read own security settings" on public.user_security_settings for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_personal_security_code(p_code text, p_enabled boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if p_enabled and (p_code is null or length(trim(p_code)) < 6 or length(trim(p_code)) > 32) then
    raise exception 'Il codice personale deve contenere da 6 a 32 caratteri';
  end if;
  insert into public.user_security_settings(user_id, personal_code_hash, personal_code_enabled, updated_at)
  values (auth.uid(), case when p_enabled then crypt(trim(p_code), gen_salt('bf')) else null end, p_enabled, now())
  on conflict (user_id) do update set personal_code_hash=excluded.personal_code_hash, personal_code_enabled=excluded.personal_code_enabled, updated_at=now();
end; $$;
create or replace function public.verify_personal_security_code(p_code text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  select personal_code_hash into v_hash from public.user_security_settings where user_id=auth.uid() and personal_code_enabled=true;
  if v_hash is null or p_code is null then return false; end if;
  return crypt(trim(p_code), v_hash)=v_hash;
end; $$;
revoke all on function public.set_personal_security_code(text, boolean) from public, anon;
grant execute on function public.set_personal_security_code(text, boolean) to authenticated;
revoke all on function public.verify_personal_security_code(text) from public, anon;
grant execute on function public.verify_personal_security_code(text) to authenticated;

create or replace function public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_condominium_id uuid; v_code_enabled boolean:=false; v_code_ok boolean:=false;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'condomini') then raise exception 'Operazione non autorizzata'; end if;
  select coalesce(s.personal_code_enabled,false) into v_code_enabled from public.user_security_settings s where s.user_id=auth.uid();
  if v_code_enabled then
    select public.verify_personal_security_code(p_security_code) into v_code_ok;
    if not v_code_ok then raise exception 'Codice personale non valido'; end if;
  end if;
  select c.id into v_condominium_id from public.condominiums c where c.workspace_id=p_workspace_id and c.legacy_id=p_legacy_id for update;
  if v_condominium_id is null then raise exception 'Condominio non trovato'; end if;
  delete from public.portal_registration_requests pr where pr.workspace_id=p_workspace_id and (pr.matched_member_id in (select cm.id from public.condominium_members cm where cm.condominium_id=v_condominium_id) or pr.requested_user_id in (select cm.user_id from public.condominium_members cm where cm.condominium_id=v_condominium_id and cm.user_id is not null));
  delete from public.portal_access where condominium_id=v_condominium_id;
  delete from public.condominium_requests where condominium_id=v_condominium_id;
  delete from public.communications where condominium_id=v_condominium_id;
  delete from public.activities where condominium_id=v_condominium_id;
  delete from public.suppliers where condominium_id=v_condominium_id;
  delete from public.assemblies where condominium_id=v_condominium_id;
  delete from public.deadlines where condominium_id=v_condominium_id;
  delete from public.documents where condominium_id=v_condominium_id;
  delete from public.condominium_members where condominium_id=v_condominium_id;
  delete from public.condominium_units where condominium_id=v_condominium_id;
  delete from public.condominiums where id=v_condominium_id and workspace_id=p_workspace_id;
end; $$;
revoke all on function public.delete_condominium(uuid,bigint,text) from public, anon;
grant execute on function public.delete_condominium(uuid,bigint,text) to authenticated;
drop function if exists public.delete_condominium(uuid,bigint);