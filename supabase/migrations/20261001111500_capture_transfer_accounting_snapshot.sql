create or replace function private.confirm_condominium_member_transfer(
 p_unit_id uuid,p_outgoing_member_id uuid,p_incoming_name text,p_incoming_email text,p_incoming_user_id uuid,
 p_transfer_date date,p_transfer_type text default 'Vendita',p_notes text default '',p_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_workspace uuid; v_condominium uuid; v_transfer_id uuid; v_incoming_id uuid; v_existing_count int; v_snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
 if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;
 select u.workspace_id,u.condominium_id into v_workspace,v_condominium from public.condominium_units u where u.id=p_unit_id;
 if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived=true) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;
 if not exists(select 1 from public.condominium_members m where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;
 if exists(select 1 from public.condominium_member_transfers t where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date and t.status='Confermato') then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;
 select count(*) into v_existing_count from public.condominium_members m where m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active and m.id<>p_outgoing_member_id and coalesce(m.data->>'role','')='Proprietario';
 if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;
 v_snapshot := jsonb_build_object(
  'captured_at',now(),'transfer_date',p_transfer_date,'outgoing_member_id',p_outgoing_member_id,'unit_id',p_unit_id,
  'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
  'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),
  'unit_expenses',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'expense_type',l.expense_type,'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,'amount',l.amount,'assembly_id',l.assembly_id,'deliberation_before_transfer',case when l.deliberation_date is not null and l.deliberation_date<=p_transfer_date then true else false end) order by coalesce(l.deliberation_date,l.entry_date),l.id) from public.condominium_ledger_entries l where l.unit_id=p_unit_id and l.condominium_id=v_condominium and (l.entry_date<=p_transfer_date or (l.deliberation_date is not null and l.deliberation_date<=p_transfer_date))),'[]'::jsonb),
  'legal_liability_review_required',true);
 update public.condominium_members set active=false,updated_at=now() where id=p_outgoing_member_id;
 insert into public.condominium_members(condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at)
 values(v_condominium,p_incoming_user_id,trim(p_incoming_name),nullif(lower(trim(coalesce(p_incoming_email,''))),''),
 'resident',true,'{}'::jsonb,coalesce(p_data,'{}'::jsonb)||jsonb_build_object('role','Proprietario','subentro_date',p_transfer_date,'subentro_type',p_transfer_type),p_unit_id,now(),now()) returning id into v_incoming_id;
 insert into public.condominium_member_transfers(workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data,created_by)
 values(v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
 coalesce(p_data,'{}'::jsonb)||jsonb_build_object('financial_history_preserved',true,'legal_liability_review_required',true,'accounting_snapshot',v_snapshot),auth.uid()) returning id into v_transfer_id;
 return v_transfer_id;
end; $$;
revoke execute on function private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon,public;