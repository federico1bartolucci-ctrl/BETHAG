create table if not exists public.portal_registration_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  requested_user_id uuid references public.profiles(id) on delete set null,
  matched_member_id uuid references public.condominium_members(id) on delete set null,
  email text not null,
  full_name text not null,
  fiscal_code text,
  condominium_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);
create index if not exists idx_portal_registration_requests_workspace_status on public.portal_registration_requests(workspace_id,status,created_at desc);
create index if not exists idx_portal_registration_requests_email on public.portal_registration_requests(lower(email));
alter table public.portal_registration_requests enable row level security;
create or replace function private.is_workspace_manager(target_workspace uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists (select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=auth.uid() and wm.active=true and wm.role in ('admin','collaborator')); $$;
revoke execute on function private.is_workspace_manager(uuid) from public,anon,authenticated;
create policy "managers read portal registration requests" on public.portal_registration_requests for select to authenticated using ((select private.is_workspace_manager(workspace_id)));
create policy "managers update portal registration requests" on public.portal_registration_requests for update to authenticated using ((select private.is_workspace_manager(workspace_id))) with check ((select private.is_workspace_manager(workspace_id)));
create or replace function public.complete_portal_registration(p_full_name text,p_fiscal_code text default null,p_condominium_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ begin raise exception 'Replaced by subsequent registration migration'; end; $$;
revoke execute on function public.complete_portal_registration(text,text,text) from public,anon;
grant execute on function public.complete_portal_registration(text,text,text) to authenticated;
create or replace function public.admin_approve_portal_registration(p_request_id uuid,p_member_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ begin raise exception 'Replaced by subsequent registration migration'; end; $$;
revoke execute on function public.admin_approve_portal_registration(uuid,uuid) from public,anon;
grant execute on function public.admin_approve_portal_registration(uuid,uuid) to authenticated;