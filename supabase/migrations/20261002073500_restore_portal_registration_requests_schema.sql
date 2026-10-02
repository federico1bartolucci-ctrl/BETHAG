-- Restore registration request table and workspace-scoped manager access in QA.
create table if not exists public.portal_registration_requests (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid references public.workspaces(id) on delete cascade,
 requested_user_id uuid references public.profiles(id) on delete set null,
 matched_member_id uuid references public.condominium_members(id) on delete set null,
 email text not null,
 full_name text not null,
 fiscal_code text,
 condominium_name text,
 status text not null default 'pending' check (status in ('pending','email_mismatch','approved','rejected')),
 note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id) on delete set null
);
create index if not exists idx_portal_registration_requests_workspace_status on public.portal_registration_requests(workspace_id,status,created_at desc);
create index if not exists idx_portal_registration_requests_email on public.portal_registration_requests(lower(email));
create index if not exists portal_registration_requests_matched_member_id_idx on public.portal_registration_requests(matched_member_id);
create index if not exists portal_registration_requests_requested_user_id_idx on public.portal_registration_requests(requested_user_id);
create index if not exists portal_registration_requests_reviewed_by_idx on public.portal_registration_requests(reviewed_by);
alter table public.portal_registration_requests enable row level security;
drop policy if exists "managers read portal registration requests" on public.portal_registration_requests;
create policy "managers read portal registration requests" on public.portal_registration_requests for select to authenticated using (private.can_manage_workspace_module(workspace_id,'portale'));
drop policy if exists "managers update portal registration requests" on public.portal_registration_requests;
create policy "managers update portal registration requests" on public.portal_registration_requests for update to authenticated using (private.can_manage_workspace_module(workspace_id,'portale')) with check (private.can_manage_workspace_module(workspace_id,'portale'));
create or replace function public.validate_portal_registration_request_scope()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare v_member_workspace uuid;
begin
 if new.matched_member_id is not null then
  select c.workspace_id into v_member_workspace from public.condominium_members m join public.condominiums c on c.id=m.condominium_id where m.id=new.matched_member_id;
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
drop trigger if exists trg_validate_portal_registration_request_scope on public.portal_registration_requests;
create trigger trg_validate_portal_registration_request_scope before insert or update on public.portal_registration_requests for each row execute function public.validate_portal_registration_request_scope();
grant select,update on public.portal_registration_requests to authenticated;
revoke all on public.portal_registration_requests from anon;
