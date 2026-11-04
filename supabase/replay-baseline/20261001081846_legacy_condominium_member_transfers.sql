-- Replay-only reconstruction of a pre-ledger relation first used by 20261001081847.
-- Definition is reconstructed from the read-only Production catalog (2026-11-04).
-- Never deploy this synthetic prerequisite to QA or Production.
create table public.condominium_member_transfers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  unit_id uuid not null references public.condominium_units(id) on delete cascade,
  outgoing_member_id uuid not null references public.condominium_members(id) on delete restrict,
  incoming_member_id uuid references public.condominium_members(id) on delete set null,
  transfer_date date not null,
  transfer_type text not null default 'Vendita'
    check (transfer_type in ('Vendita','Acquisto','Donazione','Successione','Altro')),
  status text not null default 'Confermato'
    check (status in ('Bozza','Confermato','Chiuso','Annullato')),
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null
);
