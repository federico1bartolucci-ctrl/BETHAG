-- Reconcile the transfer status constraint across historical migration variants.
-- Earlier migrations used both *_status_ck and *_status_check names. Dropping
-- both before adding the canonical constraint makes the final state deterministic.
-- Forward-only: do not edit migration files that may already be recorded/applied.

do $migration$
begin
  if to_regclass('public.condominium_member_transfers') is null then
    raise exception 'Required table public.condominium_member_transfers is missing; apply the transfer baseline first';
  end if;

  -- Refuse to install the constraint if existing rows contain an unknown value.
  -- Preserve records for explicit reconciliation rather than silently rewriting them.
  if exists (
    select 1
    from public.condominium_member_transfers
    where status is null
       or status not in ('Bozza','Confermato','Chiuso','Annullato')
  ) then
    raise exception 'Unsupported transfer status values exist; inspect public.condominium_member_transfers.status before applying this migration';
  end if;

  alter table public.condominium_member_transfers
    drop constraint if exists condominium_member_transfers_status_ck;

  alter table public.condominium_member_transfers
    drop constraint if exists condominium_member_transfers_status_check;

  alter table public.condominium_member_transfers
    add constraint condominium_member_transfers_status_check
    check (status = any (array['Bozza','Confermato','Chiuso','Annullato']));
end
$migration$;
