begin;

create or replace function public.assign_condominium_member_legacy_id()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  if new.legacy_id is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.condominium_id::text,0));
    select coalesce(max(m.legacy_id),0)+1 into new.legacy_id
    from public.condominium_members m where m.condominium_id=new.condominium_id;
  end if;
  return new;
end;
$function$;

create or replace function public.clean_deleted_member_owner_references()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  if old.legacy_id is not null then
    update public.condominium_units as u
    set data=pg_catalog.jsonb_set(coalesce(u.data,'{}'::pg_catalog.jsonb),'{ownerMemberIds}',
      coalesce((select pg_catalog.jsonb_agg(e.elem order by e.ord)
        from pg_catalog.jsonb_array_elements(case when pg_catalog.jsonb_typeof(u.data->'ownerMemberIds')='array' then u.data->'ownerMemberIds' else '[]'::pg_catalog.jsonb end) with ordinality as e(elem,ord)
        where e.elem #>> '{}' <> old.legacy_id::text),'[]'::pg_catalog.jsonb),true),
      updated_at=pg_catalog.now()
    from public.condominiums c
    where c.id=u.condominium_id and c.id=old.condominium_id and u.workspace_id=c.workspace_id
      and pg_catalog.jsonb_typeof(u.data->'ownerMemberIds')='array'
      and exists(select 1 from pg_catalog.jsonb_array_elements(u.data->'ownerMemberIds') e(elem) where e.elem #>> '{}' = old.legacy_id::text);
  end if;
  return old;
end;
$function$;

create or replace function public.normalize_condominium_member_contact()
returns trigger language plpgsql set search_path='public'
as $function$
begin
  if new.email is not null then new.email:=nullif(lower(btrim(new.email)),''); end if;
  new.role:=nullif(btrim(new.role),'');
  if new.role is null then new.role:='resident'; end if;
  return new;
end;
$function$;

create or replace function public.normalize_condominium_member_names()
returns trigger language plpgsql set search_path='public'
as $function$
declare v_data jsonb;
begin
  v_data:=coalesce(new.data,'{}'::jsonb);
  if nullif(btrim(coalesce(v_data->>'lastName','')),'') is not null then
    v_data:=jsonb_set(v_data,'{lastName}',to_jsonb(upper(btrim(v_data->>'lastName'))),true);
  end if;
  if nullif(btrim(coalesce(v_data->>'firstName','')),'') is not null then
    v_data:=jsonb_set(v_data,'{firstName}',to_jsonb(initcap(lower(btrim(v_data->>'firstName')))),true);
  end if;
  new.data:=v_data;
  return new;
end;
$function$;

create or replace function public.prevent_archived_condominium_mutation()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_condominium_id uuid;
begin
  if tg_op='DELETE' then return old; end if;
  v_condominium_id:=new.condominium_id;
  if v_condominium_id is not null and exists(select 1 from public.condominiums c where c.id=v_condominium_id and c.archived_at is not null) then
    raise exception 'Il condominio è archiviato: modifica non consentita';
  end if;
  return new;
end;
$function$;

create or replace function public.prevent_member_delete_with_financial_history()
returns trigger language plpgsql set search_path='public'
as $function$
begin
  if exists(select 1 from public.condominium_installments i where i.member_id=old.id)
     or exists(select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
     or exists(select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id)
  then raise exception 'MEMBER_FINANCIAL_HISTORY_LOCK: non è possibile eliminare un membro con storico contabile; disattivare la posizione o creare una nuova posizione anagrafica'; end if;
  return old;
end;
$function$;

create or replace function public.prevent_member_unit_reassignment_with_financial_history()
returns trigger language plpgsql set search_path='public'
as $function$
begin
  if new.unit_id is distinct from old.unit_id and (
    exists(select 1 from public.condominium_installments i where i.member_id=old.id)
    or exists(select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
    or exists(select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id))
  then raise exception 'MEMBER_UNIT_HISTORY_LOCK: non è possibile riassegnare l''unità di un membro con storico contabile; creare una nuova posizione anagrafica per il nuovo intestatario'; end if;
  if new.condominium_id is distinct from old.condominium_id and (
    exists(select 1 from public.condominium_installments i where i.member_id=old.id)
    or exists(select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
    or exists(select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id))
  then raise exception 'MEMBER_CONDOMINIUM_HISTORY_LOCK: non è possibile spostare un membro con storico contabile in un altro condominio'; end if;
  return new;
end;
$function$;

create or replace function public.sync_condominium_member_unit_legacy_fields()
returns trigger language plpgsql set search_path='public'
as $function$
declare v_code text;
begin
  if new.unit_id is not null then
    select unit_code into v_code from public.condominium_units where id=new.unit_id;
    new.data:=jsonb_set(jsonb_set(coalesce(new.data,'{}'::jsonb),'{unitId}',to_jsonb(new.unit_id::text),true),'{apartment}',to_jsonb(v_code),true);
  else new.data:=new.data-'unitId'-'apartment';
  end if;
  return new;
end;
$function$;

create or replace function public.validate_condominium_member_unit_scope()
returns trigger language plpgsql set search_path='public'
as $function$
declare v_cond_workspace uuid; v_unit_cond uuid; v_unit_workspace uuid;
begin
  select workspace_id into v_cond_workspace from public.condominiums where id=new.condominium_id;
  if v_cond_workspace is null then raise exception 'Il condominio indicato non esiste'; end if;
  if new.unit_id is not null then
    select condominium_id,workspace_id into v_unit_cond,v_unit_workspace from public.condominium_units where id=new.unit_id;
    if v_unit_cond is null then raise exception 'L''unità immobiliare indicata non esiste'; end if;
    if v_unit_cond<>new.condominium_id or v_unit_workspace<>v_cond_workspace then
      raise exception 'Condomino e unità immobiliare devono appartenere allo stesso condominio e workspace';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.validate_portal_access_scope()
returns trigger language plpgsql security definer set search_path=''
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

create or replace function public.validate_portal_registration_request_scope()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_member_workspace uuid;
begin
  if new.matched_member_id is not null then
    select c.workspace_id into v_member_workspace
    from public.condominium_members m join public.condominiums c on c.id=m.condominium_id
    where m.id=new.matched_member_id;
    if v_member_workspace is null then raise exception 'Membro associato alla richiesta portale non trovato'; end if;
    if new.workspace_id is null then new.workspace_id:=v_member_workspace;
    elsif new.workspace_id<>v_member_workspace then raise exception 'Workspace della richiesta portale non coerente con il membro'; end if;
  end if;
  if new.status='approved' and (new.workspace_id is null or new.matched_member_id is null or new.requested_user_id is null) then
    raise exception 'Una richiesta portale approvata deve avere workspace, membro e utente associati';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_assign_condominium_member_legacy_id on public.condominium_members;
create trigger trg_assign_condominium_member_legacy_id before insert on public.condominium_members for each row execute function public.assign_condominium_member_legacy_id();

drop trigger if exists trg_clean_deleted_member_owner_references on public.condominium_members;
create trigger trg_clean_deleted_member_owner_references after delete on public.condominium_members for each row execute function public.clean_deleted_member_owner_references();

drop trigger if exists trg_normalize_condominium_member_contact on public.condominium_members;
create trigger trg_normalize_condominium_member_contact before insert or update on public.condominium_members for each row execute function public.normalize_condominium_member_contact();

drop trigger if exists trg_normalize_condominium_member_names on public.condominium_members;
create trigger trg_normalize_condominium_member_names before insert or update on public.condominium_members for each row execute function public.normalize_condominium_member_names();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.condominium_members;
create trigger trg_prevent_archived_condominium_mutation before insert or update on public.condominium_members for each row execute function public.prevent_archived_condominium_mutation();

drop trigger if exists trg_prevent_member_delete_with_financial_history on public.condominium_members;
create trigger trg_prevent_member_delete_with_financial_history before delete on public.condominium_members for each row execute function public.prevent_member_delete_with_financial_history();

drop trigger if exists trg_prevent_member_unit_reassignment_with_financial_history on public.condominium_members;
create trigger trg_prevent_member_unit_reassignment_with_financial_history before update on public.condominium_members for each row execute function public.prevent_member_unit_reassignment_with_financial_history();

drop trigger if exists trg_sync_member_unit_legacy_fields on public.condominium_members;
create trigger trg_sync_member_unit_legacy_fields before insert or update of unit_id on public.condominium_members for each row execute function public.sync_condominium_member_unit_legacy_fields();

drop trigger if exists trg_validate_member_unit_scope on public.condominium_members;
create trigger trg_validate_member_unit_scope before insert or update on public.condominium_members for each row execute function public.validate_condominium_member_unit_scope();

drop trigger if exists trg_prevent_archived_condominium_mutation on public.portal_access;
create trigger trg_prevent_archived_condominium_mutation before insert or update on public.portal_access for each row execute function public.prevent_archived_condominium_mutation();

drop trigger if exists trg_validate_portal_access_scope on public.portal_access;
create trigger trg_validate_portal_access_scope before insert or update on public.portal_access for each row execute function public.validate_portal_access_scope();

drop trigger if exists trg_validate_portal_registration_request_scope on public.portal_registration_requests;
create trigger trg_validate_portal_registration_request_scope before insert or update on public.portal_registration_requests for each row execute function public.validate_portal_registration_request_scope();

revoke execute on function public.assign_condominium_member_legacy_id() from public,anon,authenticated;
revoke execute on function public.clean_deleted_member_owner_references() from public,anon,authenticated;
revoke execute on function public.prevent_archived_condominium_mutation() from public,anon,authenticated;
revoke execute on function public.validate_portal_access_scope() from public,anon,authenticated;
revoke execute on function public.validate_portal_registration_request_scope() from public,anon,authenticated;

commit;