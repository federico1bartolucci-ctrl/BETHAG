-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
CREATE OR REPLACE FUNCTION private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
    and archived_at is not null
  returning name into v_name;

  if not found then
    raise exception 'Condominio archiviato non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'restored',
      'Condominio ripristinato dall''archivio',
      jsonb_build_object(
        'restored_by', auth.uid(),
        'restored_at', now(),
        'name', v_name
      )
    );
end;
$function$
;

-- private.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
CREATE OR REPLACE FUNCTION private.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_payment public.condominium_payment_movements%rowtype;
  v_year_status text;
  v_actor uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'La motivazione dello storno è obbligatoria';
  end if;

  select * into v_payment
  from public.condominium_payment_movements
  where id=p_payment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Pagamento non trovato o non appartenente al condominio';
  end if;

  select fy.status into v_year_status
  from public.condominium_installments i
  left join public.condominium_fiscal_years fy on fy.id=i.fiscal_year_id
  where i.id=v_payment.installment_id
    and i.workspace_id=p_workspace_id
    and i.condominium_id=p_condominium_id;

  if v_year_status='Chiuso' then
    raise exception 'L''esercizio contabile è chiuso: storno non consentito';
  end if;

  if exists (
    select 1 from public.condominium_payment_reversal_audit
    where original_payment_id=v_payment.id
  ) then
    raise exception 'Il pagamento è già stato stornato';
  end if;

  insert into public.condominium_payment_reversal_audit(
    original_payment_id,workspace_id,condominium_id,installment_id,
    amount,payment_date,method,reference,notes,reversal_reason,reversed_by
  )
  values (
    v_payment.id,v_payment.workspace_id,v_payment.condominium_id,
    v_payment.installment_id,v_payment.amount,v_payment.payment_date,
    v_payment.method,v_payment.reference,v_payment.notes,
    trim(p_reason),v_actor
  );

  delete from public.condominium_payment_movements
  where id=v_payment.id;

  return true;
end;
$function$
;

-- private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb)
CREATE OR REPLACE FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_archived_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  if p_legacy_id is not null then
    select id, archived_at
      into v_id, v_archived_at
    from public.condominiums
    where workspace_id = p_workspace_id
      and legacy_id = p_legacy_id
    for update;

    if v_id is not null and v_archived_at is not null then
      raise exception 'Il condominio è archiviato: utilizzare prima il ripristino';
    end if;
  end if;

  insert into public.condominiums (
    workspace_id, legacy_id, name, address, city, postal_code, province, data
  )
  values (
    p_workspace_id, p_legacy_id, p_name, p_address, p_city, p_postal_code,
    p_province, coalesce(p_data, '{}'::jsonb)
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
$function$
;

-- private.set_personal_security_code(p_code text, p_enabled boolean)
CREATE OR REPLACE FUNCTION private.set_personal_security_code(p_code text, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if p_enabled and (p_code is null or length(trim(p_code)) < 6 or length(trim(p_code)) > 32) then
    raise exception 'Il codice personale deve contenere da 6 a 32 caratteri';
  end if;
  insert into public.user_security_settings(user_id, personal_code_hash, personal_code_enabled, updated_at)
  values (auth.uid(), case when p_enabled then crypt(trim(p_code), gen_salt('bf')) else null end, p_enabled, now())
  on conflict (user_id) do update set personal_code_hash=excluded.personal_code_hash, personal_code_enabled=excluded.personal_code_enabled, updated_at=now();
end; $function$
;

-- private.sync_portal_after_member_change()
CREATE OR REPLACE FUNCTION private.sync_portal_after_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_old_workspace uuid;
 v_new_workspace uuid;
begin
 select c.workspace_id into v_old_workspace
 from public.condominiums c
 where c.id=old.condominium_id;

 select c.workspace_id into v_new_workspace
 from public.condominiums c
 where c.id=coalesce(new.condominium_id,old.condominium_id);

 if tg_op='DELETE' then
   update public.portal_access
   set active=false, updated_at=now()
   where member_id=old.id;

   update public.workspace_members wm
   set active=false
   where wm.workspace_id=v_old_workspace
     and wm.user_id=old.user_id
     and wm.role='resident'
     and wm.condominium_id=old.condominium_id;
   return old;
 end if;

 if new.active=false or new.user_id is null then
   update public.portal_access
   set active=false, user_id=coalesce(new.user_id,user_id), updated_at=now()
   where member_id=new.id;

   update public.workspace_members wm
   set active=false
   where wm.workspace_id=v_old_workspace
     and wm.user_id=old.user_id
     and wm.role='resident'
     and wm.condominium_id=old.condominium_id;

   if new.user_id is distinct from old.user_id then
     update public.workspace_members wm
     set active=false
     where wm.workspace_id=v_new_workspace
       and wm.user_id=new.user_id
       and wm.role='resident'
       and wm.condominium_id=new.condominium_id;
   end if;
 else
   if old.user_id is distinct from new.user_id
      or old.condominium_id is distinct from new.condominium_id
      or v_old_workspace is distinct from v_new_workspace then
     update public.workspace_members wm
     set active=false
     where wm.workspace_id=v_old_workspace
       and wm.user_id=old.user_id
       and wm.role='resident'
       and wm.condominium_id=old.condominium_id;
   end if;

   update public.portal_access p
   set user_id=new.user_id,
       name=new.name,
       email=coalesce(new.email,p.email),
       apartment=coalesce(new.data->>'apartment',p.apartment),
       data=coalesce(new.data,'{}'::jsonb),
       updated_at=now()
   where p.member_id=new.id
     and p.active=true;

   update public.workspace_members wm
   set user_id=new.user_id,
       active=true
   where wm.workspace_id=v_new_workspace
     and wm.role='resident'
     and wm.condominium_id=new.condominium_id
     and wm.user_id=old.user_id;
 end if;

 return new;
end;
$function$
;

-- private.touch_condominium_request_updated_at()
CREATE OR REPLACE FUNCTION private.touch_condominium_request_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

-- private.verify_personal_security_code(p_code text)
CREATE OR REPLACE FUNCTION private.verify_personal_security_code(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  select personal_code_hash into v_hash from public.user_security_settings where user_id=auth.uid() and personal_code_enabled=true;
  if v_hash is null or p_code is null then return false; end if;
  return crypt(trim(p_code), v_hash)=v_hash;
end; $function$
;

-- public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
CREATE OR REPLACE FUNCTION public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.admin_approve_portal_registration($1,$2); end $function$
;
