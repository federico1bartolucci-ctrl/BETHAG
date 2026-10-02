-- Serialize ownership transfers per unit to prevent concurrent confirmations.
-- The row lock is held until the RPC transaction commits or rolls back.
CREATE OR REPLACE FUNCTION private.confirm_condominium_member_transfer(
  p_unit_id uuid,
  p_outgoing_member_id uuid,
  p_incoming_name text,
  p_incoming_email text,
  p_incoming_user_id uuid,
  p_transfer_date date,
  p_transfer_type text DEFAULT 'Vendita'::text,
  p_notes text DEFAULT ''::text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_workspace uuid;
  v_condominium uuid;
  v_transfer_id uuid;
  v_incoming_id uuid;
  v_existing_count int;
  v_snapshot jsonb;
  v_out_data jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_transfer_date IS NULL THEN RAISE EXCEPTION 'TRANSFER_DATE_REQUIRED'; END IF;
  IF nullif(trim(coalesce(p_incoming_name,'')),'') IS NULL THEN RAISE EXCEPTION 'INCOMING_NAME_REQUIRED'; END IF;

  -- Lock the unit before checking its current owner or existing transfers.
  -- A concurrent call for the same unit waits, then evaluates committed state.
  SELECT u.workspace_id, u.condominium_id
    INTO v_workspace, v_condominium
  FROM public.condominium_units u
  WHERE u.id = p_unit_id
  FOR UPDATE;

  IF v_workspace IS NULL OR NOT private.can_manage_workspace_module(v_workspace,'condomini') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.condominiums c
    WHERE c.id = v_condominium AND c.archived_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'ARCHIVED_CONDOMINIUM'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.condominium_members m
    WHERE m.id=p_outgoing_member_id AND m.condominium_id=v_condominium
      AND m.unit_id=p_unit_id AND m.active
  ) THEN RAISE EXCEPTION 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.condominium_member_transfers t
    WHERE t.unit_id=p_unit_id AND t.transfer_date=p_transfer_date
      AND t.status IN ('Confermato','Chiuso')
  ) THEN RAISE EXCEPTION 'TRANSFER_ALREADY_EXISTS'; END IF;

  SELECT count(*) INTO v_existing_count
  FROM public.condominium_members m
  WHERE m.condominium_id=v_condominium
    AND m.unit_id=p_unit_id
    AND m.active
    AND m.id<>p_outgoing_member_id
    AND coalesce(m.data->>'current_owner','true')='true'
    AND coalesce(m.data->>'position_status','Attivo') <> 'In chiusura'
    AND trim(coalesce(m.data->>'role',''))='Proprietario';

  IF v_existing_count>0 THEN RAISE EXCEPTION 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; END IF;

  v_snapshot := jsonb_build_object(
    'captured_at',now(),
    'transfer_date',p_transfer_date,
    'outgoing_member_id',p_outgoing_member_id,
    'unit_id',p_unit_id,
    'installments_due_before',coalesce((SELECT sum(i.amount) FROM public.condominium_installments i WHERE i.member_id=p_outgoing_member_id AND i.due_date<=p_transfer_date),0),
    'installments_paid_before',coalesce((SELECT sum(i.paid_amount) FROM public.condominium_installments i WHERE i.member_id=p_outgoing_member_id AND i.due_date<=p_transfer_date),0),
    'installments_residual',coalesce((SELECT sum(i.amount-i.paid_amount) FROM public.condominium_installments i WHERE i.member_id=p_outgoing_member_id AND i.due_date<=p_transfer_date),0),
    'allocations_before',coalesce((SELECT sum(a.amount) FROM public.condominium_expense_allocations a WHERE a.member_id=p_outgoing_member_id AND (a.due_date IS NULL OR a.due_date<=p_transfer_date)),0),
    'legal_liability_review_required',true
  );

  SELECT coalesce(m.data,'{}'::jsonb) INTO v_out_data
  FROM public.condominium_members m WHERE m.id=p_outgoing_member_id FOR UPDATE;

  UPDATE public.condominium_members
  SET active=true, updated_at=now(),
      data=v_out_data||jsonb_build_object(
        'position_status','In chiusura',
        'current_owner',false,
        'subentro_date',p_transfer_date,
        'subentro_type',p_transfer_type
      )
  WHERE id=p_outgoing_member_id;

  UPDATE public.portal_access SET active=false WHERE member_id=p_outgoing_member_id;

  UPDATE public.workspace_members
  SET active=false, updated_at=now()
  WHERE workspace_id=v_workspace AND condominium_id=v_condominium
    AND legacy_id=(SELECT m.legacy_id FROM public.condominium_members m WHERE m.id=p_outgoing_member_id)
    AND role='resident';

  INSERT INTO public.condominium_members(
    condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at
  )
  VALUES(
    v_condominium,p_incoming_user_id,trim(p_incoming_name),
    nullif(lower(trim(coalesce(p_incoming_email,''))), ''),
    'resident',true,'{}'::jsonb,
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object(
      'role','Proprietario',
      'position_status','Attivo',
      'current_owner',true,
      'subentro_date',p_transfer_date,
      'subentro_type',p_transfer_type
    ),
    p_unit_id,now(),now()
  )
  RETURNING id INTO v_incoming_id;

  INSERT INTO public.condominium_member_transfers(
    workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,
    transfer_date,transfer_type,status,notes,data,created_by
  )
  VALUES(
    v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,
    p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object(
      'financial_history_preserved',true,
      'legal_liability_review_required',true,
      'accounting_snapshot',v_snapshot,
      'outgoing_portal_deactivated',true
    ),
    auth.uid()
  )
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$function$;