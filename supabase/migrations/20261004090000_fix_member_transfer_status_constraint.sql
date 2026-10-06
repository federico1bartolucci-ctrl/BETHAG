-- BETHAG: reconcile the original transfer status check with the lifecycle extension.
-- The introducing migration created condominium_member_transfers_status_ck,
-- while the lifecycle migration dropped condominium_member_transfers_status_check.
-- Remove both possible names, then keep one canonical check that permits closure.
alter table public.condominium_member_transfers
  drop constraint if exists condominium_member_transfers_status_ck;

alter table public.condominium_member_transfers
  drop constraint if exists condominium_member_transfers_status_check;

alter table public.condominium_member_transfers
  add constraint condominium_member_transfers_status_ck
  check (status = any (array['Bozza','Confermato','Chiuso','Annullato']::text[]));
