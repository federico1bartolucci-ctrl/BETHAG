-- Include all material SAL fields in the audit decision and payload.
CREATE OR REPLACE FUNCTION public.audit_condominium_work_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  ws uuid;
  co uuid;
  wid uuid;
  pid uuid;
  act text;
  descr text;
  dat jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    ws := OLD.workspace_id;
    co := OLD.condominium_id;
    wid := OLD.work_id;
    pid := OLD.id;
    act := 'work_progress_deleted';
    descr := 'SAL eliminato';
    dat := jsonb_build_object(
      'work_id', OLD.work_id,
      'progress_no', OLD.progress_no,
      'progress_date', OLD.progress_date,
      'title', OLD.title,
      'status', OLD.status,
      'amount', OLD.amount,
      'paid_amount', OLD.paid_amount,
      'percentage', OLD.percentage,
      'notes', OLD.notes,
      'ledger_entry_id', OLD.ledger_entry_id,
      'payment_entry_id', OLD.payment_entry_id
    );
  ELSIF TG_OP = 'INSERT' THEN
    ws := NEW.workspace_id;
    co := NEW.condominium_id;
    wid := NEW.work_id;
    pid := NEW.id;
    act := 'work_progress_created';
    descr := 'SAL registrato';
    dat := jsonb_build_object(
      'work_id', NEW.work_id,
      'progress_no', NEW.progress_no,
      'progress_date', NEW.progress_date,
      'title', NEW.title,
      'status', NEW.status,
      'amount', NEW.amount,
      'paid_amount', NEW.paid_amount,
      'percentage', NEW.percentage,
      'notes', NEW.notes,
      'ledger_entry_id', NEW.ledger_entry_id,
      'payment_entry_id', NEW.payment_entry_id
    );
  ELSE
    IF OLD.workspace_id IS NOT DISTINCT FROM NEW.workspace_id
       AND OLD.condominium_id IS NOT DISTINCT FROM NEW.condominium_id
       AND OLD.work_id IS NOT DISTINCT FROM NEW.work_id
       AND OLD.progress_no IS NOT DISTINCT FROM NEW.progress_no
       AND OLD.progress_date IS NOT DISTINCT FROM NEW.progress_date
       AND OLD.title IS NOT DISTINCT FROM NEW.title
       AND OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.amount IS NOT DISTINCT FROM NEW.amount
       AND OLD.paid_amount IS NOT DISTINCT FROM NEW.paid_amount
       AND OLD.percentage IS NOT DISTINCT FROM NEW.percentage
       AND OLD.notes IS NOT DISTINCT FROM NEW.notes
       AND OLD.ledger_entry_id IS NOT DISTINCT FROM NEW.ledger_entry_id
       AND OLD.payment_entry_id IS NOT DISTINCT FROM NEW.payment_entry_id
    THEN
      RETURN NEW;
    END IF;

    ws := NEW.workspace_id;
    co := NEW.condominium_id;
    wid := NEW.work_id;
    pid := NEW.id;
    act := 'work_progress_changed';
    descr := 'SAL modificato';
    dat := jsonb_build_object(
      'old_workspace_id', OLD.workspace_id,
      'new_workspace_id', NEW.workspace_id,
      'old_condominium_id', OLD.condominium_id,
      'new_condominium_id', NEW.condominium_id,
      'old_work_id', OLD.work_id,
      'new_work_id', NEW.work_id,
      'old_progress_no', OLD.progress_no,
      'new_progress_no', NEW.progress_no,
      'old_progress_date', OLD.progress_date,
      'new_progress_date', NEW.progress_date,
      'old_title', OLD.title,
      'new_title', NEW.title,
      'old_amount', OLD.amount,
      'new_amount', NEW.amount,
      'old_paid_amount', OLD.paid_amount,
      'new_paid_amount', NEW.paid_amount,
      'old_percentage', OLD.percentage,
      'new_percentage', NEW.percentage,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_notes', OLD.notes,
      'new_notes', NEW.notes,
      'old_ledger_entry_id', OLD.ledger_entry_id,
      'new_ledger_entry_id', NEW.ledger_entry_id,
      'old_payment_entry_id', OLD.payment_entry_id,
      'new_payment_entry_id', NEW.payment_entry_id
    );
  END IF;

  INSERT INTO public.condominium_audit_log (
    workspace_id, condominium_id, entity_type, entity_id,
    action, description, data
  )
  VALUES (
    ws, co, 'condominium_work_progress', pid, act, descr,
    dat || jsonb_build_object(
      'work_id', wid,
      'actor_user_id', auth.uid(),
      'recorded_at', now()
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
