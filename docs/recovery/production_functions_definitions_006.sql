-- RECOVERY SNAPSHOT ONLY: production function definitions, read-only catalog extraction.
-- Not an executable migration. Review dependencies, owners, grants, and ordering before replay.

-- public.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone)
CREATE OR REPLACE FUNCTION public.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select private.apply_resend_communication_event(
    p_provider_message_id,p_event_id,p_event_type,p_email,p_event_at
  );
$function$
;

-- public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text)
CREATE OR REPLACE FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.archive_condominium($1,$2,$3); end $function$
;

-- public.audit_condominium_work_change()
CREATE OR REPLACE FUNCTION public.audit_condominium_work_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_condominium_id uuid;
  v_work_id uuid;
  v_action text;
  v_description text;
  v_data jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    v_workspace_id := old.workspace_id;
    v_condominium_id := old.condominium_id;
    v_work_id := old.id;
    v_action := 'work_deleted';
    v_description := 'Lavoro eliminato';
    v_data := jsonb_build_object('title', old.title, 'status', old.status);
  elsif tg_op = 'INSERT' then
    v_workspace_id := new.workspace_id;
    v_condominium_id := new.condominium_id;
    v_work_id := new.id;
    v_action := 'work_created';
    v_description := 'Lavoro creato';
    v_data := jsonb_build_object('title', new.title, 'status', new.status);
  else
    v_workspace_id := new.workspace_id;
    v_condominium_id := new.condominium_id;
    v_work_id := new.id;

    if old.status is distinct from new.status then
      v_action := 'work_status_changed';
      v_description := 'Stato del lavoro modificato';
      v_data := jsonb_build_object('old_status',old.status,'new_status',new.status);
    elsif old.approved_amount is distinct from new.approved_amount
       or old.estimated_amount is distinct from new.estimated_amount then
      v_action := 'work_budget_changed';
      v_description := 'Importi del lavoro modificati';
      v_data := jsonb_build_object(
        'old_estimated_amount',old.estimated_amount,
        'new_estimated_amount',new.estimated_amount,
        'old_approved_amount',old.approved_amount,
        'new_approved_amount',new.approved_amount
      );
    elsif old.supplier_id is distinct from new.supplier_id then
      v_action := 'work_supplier_changed';
      v_description := 'Fornitore del lavoro modificato';
      v_data := jsonb_build_object('old_supplier_id',old.supplier_id,'new_supplier_id',new.supplier_id);
    elsif old.start_date is distinct from new.start_date
       or old.expected_end_date is distinct from new.expected_end_date
       or old.actual_end_date is distinct from new.actual_end_date then
      v_action := 'work_dates_changed';
      v_description := 'Date del lavoro modificate';
      v_data := jsonb_build_object(
        'old_start_date',old.start_date,'new_start_date',new.start_date,
        'old_expected_end_date',old.expected_end_date,'new_expected_end_date',new.expected_end_date,
        'old_actual_end_date',old.actual_end_date,'new_actual_end_date',new.actual_end_date
      );
    else
      return new;
    end if;
  end if;

  insert into public.condominium_audit_log
    (workspace_id,condominium_id,entity_type,entity_id,action,description,data)
  values
    (v_workspace_id,v_condominium_id,'condominium_work',v_work_id,v_action,v_description,
     v_data || jsonb_build_object('actor_user_id',auth.uid(),'recorded_at',now()));

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$
;

-- public.audit_condominium_work_progress_change()
CREATE OR REPLACE FUNCTION public.audit_condominium_work_progress_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_condominium_id uuid;
  v_work_id uuid;
  v_progress_id uuid;
  v_action text;
  v_description text;
  v_data jsonb;
begin
  if tg_op = 'DELETE' then
    v_workspace_id:=old.workspace_id; v_condominium_id:=old.condominium_id;
    v_work_id:=old.work_id; v_progress_id:=old.id;
    v_action:='work_progress_deleted';
    v_description:='SAL eliminato';
    v_data:=jsonb_build_object('progress_no',old.progress_no,'amount',old.amount,'percentage',old.percentage);
  elsif tg_op = 'INSERT' then
    v_workspace_id:=new.workspace_id; v_condominium_id:=new.condominium_id;
    v_work_id:=new.work_id; v_progress_id:=new.id;
    v_action:='work_progress_created';
    v_description:='SAL registrato';
    v_data:=jsonb_build_object('progress_no',new.progress_no,'amount',new.amount,'paid_amount',new.paid_amount,'percentage',new.percentage);
  else
    if old.amount is not distinct from new.amount
       and old.paid_amount is not distinct from new.paid_amount
       and old.percentage is not distinct from new.percentage
       and old.status is not distinct from new.status
       and old.progress_date is not distinct from new.progress_date
       and old.title is not distinct from new.title then
      return new;
    end if;
    v_workspace_id:=new.workspace_id; v_condominium_id:=new.condominium_id;
    v_work_id:=new.work_id; v_progress_id:=new.id;
    v_action:='work_progress_changed';
    v_description:='SAL modificato';
    v_data:=jsonb_build_object(
      'old_amount',old.amount,'new_amount',new.amount,
      'old_paid_amount',old.paid_amount,'new_paid_amount',new.paid_amount,
      'old_percentage',old.percentage,'new_percentage',new.percentage,
      'old_status',old.status,'new_status',new.status
    );
  end if;

  insert into public.condominium_audit_log
    (workspace_id,condominium_id,entity_type,entity_id,action,description,data)
  values
    (v_workspace_id,v_condominium_id,'condominium_work_progress',v_progress_id,v_action,v_description,
     v_data || jsonb_build_object('work_id',v_work_id,'actor_user_id',auth.uid(),'recorded_at',now()));

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$
;

-- public.audit_document_ai_change()
CREATE OR REPLACE FUNCTION public.audit_document_ai_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old text := coalesce(nullif(btrim(old.data->>'aiStatus'),''),'Non elaborato');
  v_new text := coalesce(nullif(btrim(new.data->>'aiStatus'),''),'Non elaborato');
begin
  if v_old is distinct from v_new then
    insert into public.condominium_audit_log
      (workspace_id,condominium_id,entity_type,entity_id,action,description,data)
    values
      (new.workspace_id,new.condominium_id,'document',new.id,'AI_STATUS_CHANGE',
       'Cambio stato elaborazione AI documento',
       jsonb_build_object('from',v_old,'to',v_new,'title',new.title,'timestamp',now()));
  end if;
  return new;
end;
$function$
;

-- public.claim_first_workspace_admin(p_workspace_id uuid)
CREATE OR REPLACE FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.claim_first_workspace_admin(p_workspace_id);
$function$
;

-- public.clean_deleted_member_owner_references()
CREATE OR REPLACE FUNCTION public.clean_deleted_member_owner_references()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_workspace uuid:=old.workspace_id;
begin
  update public.condominium_units u
  set data=jsonb_set(coalesce(u.data,'{}'::jsonb),'{ownerMemberIds}',coalesce((
    select jsonb_agg(elem order by ord)
    from jsonb_array_elements(coalesce(u.data->'ownerMemberIds','[]'::jsonb)) with ordinality as e(elem,ord)
    where elem #>> '{}' <> old.legacy_id::text
  ),'[]'::jsonb),true), updated_at=now()
  where u.workspace_id=v_workspace and u.condominium_id=old.condominium_id
    and jsonb_typeof(u.data->'ownerMemberIds')='array'
    and exists (
      select 1 from jsonb_array_elements(coalesce(u.data->'ownerMemberIds','[]'::jsonb)) e(elem)
      where elem #>> '{}' = old.legacy_id::text
    );
  return old;
end; $function$
;

-- public.clear_condominium_member_unit_legacy_fields()
CREATE OR REPLACE FUNCTION public.clear_condominium_member_unit_legacy_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.condominium_members
  set data = data - 'unitId' - 'apartment',
      updated_at = now()
  where unit_id = old.id;
  return old;
end;
$function$
;
