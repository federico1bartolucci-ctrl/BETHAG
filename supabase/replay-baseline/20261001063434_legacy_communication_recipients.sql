-- Replay-only reconstruction of a pre-ledger relation first indexed by 20261001063435.
-- Columns, defaults, checks and FK targets come from the read-only Production catalog.
-- This synthetic baseline must never be deployed to QA or Production.
create table public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  member_id uuid references public.condominium_members(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null check (position('@' in email) > 1),
  name text not null,
  recipient_role text not null default 'resident'
    check (recipient_role in ('resident','council','owner','tenant')),
  status text not null default 'pending'
    check (status in ('pending','queued','sent','delivered','failed','skipped')),
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
