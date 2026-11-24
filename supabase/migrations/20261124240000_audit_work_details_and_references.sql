-- Include descriptive and reference-only work changes in the audit log.
CREATE OR REPLACE FUNCTION public.audit_condominium_work_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  ws uuid;
  co uuid;
  wid uuid;
  meta jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    ws := OLD.workspace_id;
    co := OLD.condominium_id;
    wid := OLD.id;
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_deleted', 'Lavoro eliminato',
      jsonb_build_object('title', OLD.title, 'status', OLD.status)
      || jsonb_build_object('actor_user_id', auth.uid(), 'recorded_at', now())
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    ws := NEW.workspace_id;
    co := NEW.condominium_id;
    wid := NEW.id;
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_created', 'Lavoro creato',
      jsonb_build_object(
        'title', NEW.title,
        'category', NEW.category,
        'description', NEW.description,
        'status', NEW.status,
        'priority', NEW.priority,
        'estimated_amount', NEW.estimated_amount,
        'approved_amount', NEW.approved_amount,
        'supplier_id', NEW.supplier_id,
        'fund_id', NEW.fund_id,
        'register_item_id', NEW.register_item_id
      ) || jsonb_build_object('actor_user_id', auth.uid(), 'recorded_at', now())
    );
    RETURN NEW;
  END IF;

  ws := NEW.workspace_id;
  co := NEW.condominium_id;
  wid := NEW.id;
  meta := jsonb_build_object('actor_user_id', auth.uid(), 'recorded_at', now());

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_status_changed',
      'Stato del lavoro modificato',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status) || meta
    );
  END IF;

  IF OLD.approved_amount IS DISTINCT FROM NEW.approved_amount
     OR OLD.estimated_amount IS DISTINCT FROM NEW.estimated_amount THEN
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_budget_changed',
      'Importi del lavoro modificati',
      jsonb_build_object(
        'old_estimated_amount', OLD.estimated_amount,
        'new_estimated_amount', NEW.estimated_amount,
        'old_approved_amount', OLD.approved_amount,
        'new_approved_amount', NEW.approved_amount
      ) || meta
    );
  END IF;

  IF OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_supplier_changed',
      'Fornitore del lavoro modificato',
      jsonb_build_object('old_supplier_id', OLD.supplier_id, 'new_supplier_id', NEW.supplier_id) || meta
    );
  END IF;

  IF OLD.start_date IS DISTINCT FROM NEW.start_date
     OR OLD.expected_end_date IS DISTINCT FROM NEW.expected_end_date
     OR OLD.actual_end_date IS DISTINCT FROM NEW.actual_end_date THEN
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_dates_changed',
      'Date del lavoro modificate',
      jsonb_build_object(
        'old_start_date', OLD.start_date,
        'new_start_date', NEW.start_date,
        'old_expected_end_date', OLD.expected_end_date,
        'new_expected_end_date', NEW.expected_end_date,
        'old_actual_end_date', OLD.actual_end_date,
        'new_actual_end_date', NEW.actual_end_date
      ) || meta
    );
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title
     OR OLD.category IS DISTINCT FROM NEW.category
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.priority IS DISTINCT FROM NEW.priority
     OR OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_details_changed',
      'Dettagli del lavoro modificati',
      jsonb_build_object(
        'old_title', OLD.title, 'new_title', NEW.title,
        'old_category', OLD.category, 'new_category', NEW.category,
        'old_description', OLD.description, 'new_description', NEW.description,
        'old_priority', OLD.priority, 'new_priority', NEW.priority,
        'old_notes', OLD.notes, 'new_notes', NEW.notes
      ) || meta
    );
  END IF;

  IF OLD.fund_id IS DISTINCT FROM NEW.fund_id
     OR OLD.register_item_id IS DISTINCT FROM NEW.register_item_id THEN
    INSERT INTO public.condominium_audit_log (
      workspace_id, condominium_id, entity_type, entity_id,
      action, description, data
    )
    VALUES (
      ws, co, 'condominium_work', wid, 'work_reference_changed',
      'Riferimenti contabili del lavoro modificati',
      jsonb_build_object(
        'old_fund_id', OLD.fund_id, 'new_fund_id', NEW.fund_id,
        'old_register_item_id', OLD.register_item_id,
        'new_register_item_id', NEW.register_item_id
      ) || meta
    );
  END IF;

  RETURN NEW;
END;
$function$;
