create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null,
  workspace_id uuid not null,
  condominium_id uuid,
  member_id uuid,
  user_id uuid,
  email text not null,
  name text not null,
  recipient_role text not null default 'resident',
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bounced_at timestamptz,
  complained_at timestamptz,
  event_type text,
  provider_event_id text,
  queued_at timestamptz
);

alter table public.communication_recipients
  add constraint communication_recipients_communication_id_fkey foreign key (communication_id) references public.communications(id) on delete cascade,
  add constraint communication_recipients_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  add constraint communication_recipients_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint communication_recipients_member_id_fkey foreign key (member_id) references public.condominium_members(id) on delete set null,
  add constraint communication_recipients_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null,
  add constraint communication_recipients_email_chk check (position('@' in email) > 1),
  add constraint communication_recipients_role_chk check (recipient_role = any(array['resident','council','owner','tenant'])),
  add constraint communication_recipients_status_check check (status = any(array['pending','queued','sent','delivered','failed','skipped'])),
  add constraint communication_recipients_delivery_consistency_chk check (((status not in ('sent','delivered')) or provider_message_id is not null) and ((status <> 'delivered') or delivered_at is not null) and ((status <> 'queued') or queued_at is not null));

create unique index if not exists communication_recipients_communication_email_uq on public.communication_recipients (communication_id, lower(btrim(email)));
create index if not exists communication_recipients_condominium_id_idx on public.communication_recipients (condominium_id);
create index if not exists communication_recipients_member_idx on public.communication_recipients (member_id);
create unique index if not exists communication_recipients_provider_event_uq on public.communication_recipients (provider_event_id) where provider_event_id is not null;
create index if not exists communication_recipients_provider_message_idx on public.communication_recipients (provider_message_id) where provider_message_id is not null;
create index if not exists communication_recipients_stale_queued_idx on public.communication_recipients (status, queued_at) where status = 'queued';
create index if not exists communication_recipients_status_idx on public.communication_recipients (communication_id, status);
create index if not exists communication_recipients_user_id_idx on public.communication_recipients (user_id);
create index if not exists communication_recipients_workspace_idx on public.communication_recipients (workspace_id);

alter table public.communication_recipients enable row level security;
drop policy if exists "authorized managers manage communication recipients" on public.communication_recipients;
drop policy if exists "recipients read own communication delivery" on public.communication_recipients;
create policy "authorized managers manage communication recipients" on public.communication_recipients for all to authenticated using (private.can_manage_workspace_module(workspace_id,'comunicazioni')) with check (private.can_manage_workspace_module(workspace_id,'comunicazioni'));
create policy "recipients read own communication delivery" on public.communication_recipients for select to authenticated using (user_id = auth.uid());

create table if not exists public.condominium_audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint condominium_audit_log_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade,
  constraint condominium_audit_log_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade
);
create index if not exists condominium_audit_log_condominium_fk_idx on public.condominium_audit_log (condominium_id);
create index if not exists condominium_audit_log_scope_idx on public.condominium_audit_log (workspace_id, condominium_id, created_at desc);
alter table public.condominium_audit_log enable row level security;
drop policy if exists condominium_audit_log_read_manager on public.condominium_audit_log;
create policy condominium_audit_log_read_manager on public.condominium_audit_log for select to authenticated using (private.is_workspace_admin(workspace_id));
