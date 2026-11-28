-- Replay-only bridge for a Production column absent from every recovered ledger payload.
-- Production catalog confirms this column exists; first recorded use is 20261001083704.
-- Never deploy this synthetic prerequisite to QA or Production.
alter table public.condominiums
  add column archived_at timestamptz;

alter table public.condominiums
  add column archived_by uuid references public.profiles(id);

alter table public.condominiums
  add column archive_reason text;
