create table if not exists public.condominium_member_transfers (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 condominium_id uuid not null references public.condominiums(id) on delete cascade,
 unit_id uuid not null references public.condominium_units(id) on delete restrict,
 outgoing_member_id uuid not null references public.condominium_members(id) on delete restrict,
 incoming_member_id uuid references public.condominium_members(id) on delete restrict,
 transfer_date date not null,
 transfer_type text not null default 'Vendita',
 status text not null default 'Confermato',
 notes text not null default '',
 data jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint condominium_member_transfers_type_ck check (transfer_type in ('Vendita','Acquisto','Donazione','Successione','Altro')),
 constraint condominium_member_transfers_status_ck check (status in ('Bozza','Confermato','Annullato'))
);

alter table public.condominium_member_transfers enable row level security;
create policy condominium_member_transfers_manager_all on public.condominium_member_transfers
for all to authenticated
using (private.can_manage_workspace_module(workspace_id,'condomini'))
with check (private.can_manage_workspace_module(workspace_id,'condomini'));

create index if not exists condominium_member_transfers_unit_date_idx on public.condominium_member_transfers(unit_id, transfer_date desc);
create index if not exists condominium_member_transfers_condo_date_idx on public.condominium_member_transfers(condominium_id, transfer_date desc);
revoke all on public.condominium_member_transfers from anon;
grant select,insert,update,delete on public.condominium_member_transfers to authenticated;

create or replace function private.confirm_condominium_member_transfer(
 p_unit_id uuid,p_outgoing_member_id uuid,p_incoming_name text,p_incoming_email text,p_incoming_user_id uuid,
 p_transfer_date date,p_transfer_type text default 'Vendita',p_notes text default '',p_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_workspace uuid; v_condominium uuid; v_transfer_id uuid; v_incoming_id uuid; v_existing_count int;
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
 update public.condominium_members set active=false,updated_at=now() where id=p_outgoing_member_id;
 insert into public.condominium_members(condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at)
 values(v_condominium,p_incoming_user_id,trim(p_incoming_name),nullif(lower(trim(coalesce(p_incoming_email,''))),''),'resident',true,'{}'::jsonb,
 coalesce(p_data,'{}'::jsonb)||jsonb_build_object('role','Proprietario','subentro_date',p_transfer_date,'subentro_type',p_transfer_type),p_unit_id,now(),now())
 returning id into v_incoming_id;
 insert into public.condominium_member_transfers(workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data,created_by)
 values(v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
 coalesce(p_data,'{}'::jsonb)||jsonb_build_object('financial_history_preserved',true,'legal_liability_review_required',true),auth.uid())
 returning id into v_transfer_id;
 return v_transfer_id;
end; $$;
revoke execute on function private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon,public;

create or replace function public.confirm_condominium_member_transfer(
 p_unit_id uuid,p_outgoing_member_id uuid,p_incoming_name text,p_incoming_email text,p_incoming_user_id uuid,
 p_transfer_date date,p_transfer_type text default 'Vendita',p_notes text default '',p_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
begin return private.confirm_condominium_member_transfer(p_unit_id,p_outgoing_member_id,p_incoming_name,p_incoming_email,p_incoming_user_id,p_transfer_date,p_transfer_type,p_notes,p_data); end; $$;
revoke execute on function public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) from anon,public;
grant execute on function public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb) to authenticated;
