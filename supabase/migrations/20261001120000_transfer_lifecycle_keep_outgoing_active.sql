alter table public.condominium_member_transfers
 add column if not exists closed_at timestamptz,
 add column if not exists closed_by uuid references auth.users(id);

alter table public.condominium_member_transfers drop constraint if exists condominium_member_transfers_status_check;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_status_check
 check (status = any (array['Bozza','Confermato','Chiuso','Annullato']));

create or replace function private.confirm_condominium_member_transfer(
 p_unit_id uuid,p_outgoing_member_id uuid,p_incoming_name text,p_incoming_email text,p_incoming_user_id uuid,
 p_transfer_date date,p_transfer_type text default 'Vendita',p_notes text default '',p_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_workspace uuid; v_condominium uuid; v_transfer_id uuid; v_incoming_id uuid; v_existing_count int; v_snapshot jsonb; v_out_data jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
 if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;
 select u.workspace_id,u.condominium_id into v_workspace,v_condominium from public.condominium_units u where u.id=p_unit_id;
 if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived=true) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;
 if not exists(select 1 from public.condominium_members m where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_ON_UNIT'; end if;
 if exists(select 1 from public.condominium_member_transfers t where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date and t.status in ('Confermato','Chiuso')) then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;
 select count(*) into v_existing_count from public.condominium_members m where m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active and m.id<>p_outgoing_member_id and coalesce(m.data->>'role','')='Proprietario';
 if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;
 v_snapshot := jsonb_build_object('captured_at',now(),'transfer_date',p_transfer_date,'outgoing_member_id',p_outgoing_member_id,'unit_id',p_unit_id,
 'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
 'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
 'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where i.member_id=p_outgoing_member_id and i.due_date<=p_transfer_date),0),
 'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=p_outgoing_member_id and (a.due_date is null or a.due_date<=p_transfer_date)),0),
 'legal_liability_review_required',true);
 select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=p_outgoing_member_id for update;
 update public.condominium_members set active=true,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','In chiusura','subentro_date',p_transfer_date,'subentro_type',p_transfer_type) where id=p_outgoing_member_id;
 insert into public.condominium_members(condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at)
 values(v_condominium,p_incoming_user_id,trim(p_incoming_name),nullif(lower(trim(coalesce(p_incoming_email,''))),''),
 'resident',true,'{}'::jsonb,coalesce(p_data,'{}'::jsonb)||jsonb_build_object('role','Proprietario','position_status','Attivo','subentro_date',p_transfer_date,'subentro_type',p_transfer_type),p_unit_id,now(),now()) returning id into v_incoming_id;
 insert into public.condominium_member_transfers(workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data,created_by)
 values(v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
 coalesce(p_data,'{}'::jsonb)||jsonb_build_object('financial_history_preserved',true,'legal_liability_review_required',true,'accounting_snapshot',v_snapshot),auth.uid()) returning id into v_transfer_id;
 return v_transfer_id;
end; $$;

create or replace function private.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_workspace uuid; v_outgoing uuid; v_transfer_status text; v_open_installments numeric; v_open_allocations numeric; v_open_carryovers numeric; v_out_data jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select t.workspace_id,t.outgoing_member_id,t.status into v_workspace,v_outgoing,v_transfer_status from public.condominium_member_transfers t where t.id=p_transfer_id for update;
 if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
 select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=v_outgoing and i.amount-i.paid_amount>0.005;
 select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations from public.condominium_expense_allocations a where a.member_id=v_outgoing and a.amount-a.paid_amount>0.005;
 select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=v_outgoing and abs(c.balance)>0.005;
 if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 then raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: il cedente mantiene la posizione attiva finché tutte le situazioni contabili non sono chiuse'; end if;
 select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=v_outgoing for update;
 update public.condominium_members set active=false,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','Archiviato') where id=v_outgoing;
 update public.condominium_member_transfers set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),data=coalesce(data,'{}'::jsonb)||jsonb_build_object('financial_positions_closed',true) where id=p_transfer_id;
 return true;
end; $$;

revoke execute on function private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon,public;
revoke execute on function private.close_condominium_member_transfer(uuid) from anon,public;
create or replace function public.close_condominium_member_transfer(p_transfer_id uuid)
returns boolean language plpgsql security invoker set search_path=public as $$ begin return private.close_condominium_member_transfer(p_transfer_id); end; $$;
revoke execute on function public.close_condominium_member_transfer(uuid) from anon,public;
grant execute on function public.close_condominium_member_transfer(uuid) to authenticated;